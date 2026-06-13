// ============================================================
// Maré — Cloudflare Worker de Notificações Push
// ============================================================
// Este worker opera de forma "cega": nunca armazena dados de
// ciclo, humor ou saúde. Apenas mantém tokens de inscrição
// push anônimos para disparo de lembretes.
//
// Rotas:
//   POST /subscribe   — Registra/atualiza inscrição push
//   DELETE /unsubscribe — Remove inscrição push
//
// Cron (diário 20h):
//   Dispara lembretes para inscrições com daily_reminder=1
//   ou next_cycle_alert_date == hoje
//
// Privacidade LGPD/GDPR:
//   - Nenhum dado de ciclo, humor, sintoma ou nota é armazenado
//   - Apenas endpoint, chaves criptográficas e preferências booleanas
//   - O app funciona 100% offline se o worker estiver indisponível
// ============================================================

// ============================================================
// Helpers: base64url
// ============================================================

function base64UrlDecode(str) {
  const padding = '='.repeat((4 - (str.length % 4)) % 4)
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function base64UrlEncode(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function concat(...arrays) {
  let len = 0
  for (const a of arrays) len += a.length
  const result = new Uint8Array(len)
  let offset = 0
  for (const a of arrays) {
    result.set(a, offset)
    offset += a.length
  }
  return result
}

// ============================================================
// HKDF-SHA256 (RFC 5869) — usado na derivação de chaves
// ============================================================

async function hmacSha256(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, dataBytes))
}

async function hkdfExpand(prk, info, length) {
  const blockSize = 32 // HMAC-SHA256 output length
  const blocks = []
  let T = new Uint8Array(0)
  let i = 1
  while (blocks.length * blockSize < length) {
    T = await hmacSha256(prk, concat(T, info, new Uint8Array([i])))
    blocks.push(T)
    i++
  }
  return concat(...blocks).slice(0, length)
}

// ============================================================
// Web Push Encryption (RFC 8188 aes128gcm + RFC 8291)
// ============================================================

async function webPushEncrypt(payloadBytes, clientPubKeyBytes, authSecretBytes) {
  // Gera par de chaves ECDH efêmero
  const ecdhKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )

  // Importa chave pública do cliente para ECDH
  const clientPubCryptoKey = await crypto.subtle.importKey(
    'raw',
    clientPubKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )

  // Deriva shared secret (256 bits)
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPubCryptoKey },
    ecdhKeyPair.privateKey,
    256,
  )

  // Exporta chave pública efêmera
  const ephemPubKey = new Uint8Array(
    await crypto.subtle.exportKey('raw', ecdhKeyPair.publicKey),
  )

  // PRK = HMAC-SHA256(auth, sharedSecret || "Content-Encoding: auth\0")
  const authLabel = new TextEncoder().encode('Content-Encoding: auth\x00')
  const prk = await hmacSha256(authSecretBytes, concat(new Uint8Array(sharedSecret), authLabel))

  // Context: client_public_key || server_public_key
  const context = concat(clientPubKeyBytes, ephemPubKey)

  // Deriva CEK (Content Encryption Key, 16 bytes)
  const cekInfo = concat(
    new TextEncoder().encode('Content-Encoding: aes128gcm\x00'),
    context,
  )
  const cek = await hkdfExpand(prk, cekInfo, 16)

  // Deriva nonce (12 bytes)
  const nonceInfo = concat(
    new TextEncoder().encode('Content-Encoding: nonce\x00'),
    context,
  )
  const nonce = await hkdfExpand(prk, nonceInfo, 12)

  // Gera salt aleatório (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Monta AAD: salt || record_size || key_length || ephem_pub_key
  const recordSize = 4096
  const recordSizeBytes = new Uint8Array(4)
  new DataView(recordSizeBytes.buffer).setUint32(0, recordSize, false)

  const keyLengthByte = new Uint8Array([ephemPubKey.length]) // 65 para P-256 uncompressed
  const aad = concat(salt, recordSizeBytes, keyLengthByte, ephemPubKey)

  // Importa CEK para AES-GCM
  const cekCryptoKey = await crypto.subtle.importKey(
    'raw',
    cek,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )

  // Cifra o payload
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 },
    cekCryptoKey,
    payloadBytes,
  )

  const ciphertext = new Uint8Array(encrypted)

  // Formato final: salt(16) || recordSize(4) || key(65) || ciphertext+tag(16)
  return concat(salt, recordSizeBytes, ephemPubKey, ciphertext)
}

// ============================================================
// VAPID JWT (RFC 8292)
// ============================================================

function derToRaw(der) {
  // Converte assinatura DER para formato raw R||S (64 bytes)
  // DER: 30 <len> 02 <rLen> <r[0]? 0x00? r> 02 <sLen> <s[0]? 0x00? s>
  let offset = 2

  const rLen = der[offset + 1]
  let rStart = offset + 2
  let r = der.slice(rStart, rStart + rLen)
  if (r[0] === 0x00) r = r.slice(1) // remove leading zero (DER signed int)
  if (r.length < 32) r = concat(new Uint8Array(32 - r.length), r) // pad to 32 bytes

  offset = rStart + rLen
  const sLen = der[offset + 1]
  let sStart = offset + 2
  let s = der.slice(sStart, sStart + sLen)
  if (s[0] === 0x00) s = s.slice(1)
  if (s.length < 32) s = concat(new Uint8Array(32 - s.length), s)

  return concat(r, s)
}

async function createVapidJwt(audience, vapidPrivateKeyJwk) {
  const privateJwk = typeof vapidPrivateKeyJwk === 'string'
    ? JSON.parse(vapidPrivateKeyJwk)
    : vapidPrivateKeyJwk

  // Importa chave privada ECDSA P-256
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const header = { typ: 'JWT', alg: 'ES256' }
  const payload = {
    aud: new URL(audience).origin,
    exp: Math.floor(Date.now() / 1000) + 43200, // 12h
    sub: 'mailto:admin@mare.app',
  }

  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)))
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const signingInput = `${encodedHeader}.${encodedPayload}`

  // Assina com ECDSA
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput),
  )

  const rawSig = derToRaw(new Uint8Array(signature))
  return `${encodedHeader}.${encodedPayload}.${base64UrlEncode(rawSig)}`
}

// ============================================================
// Envio de Notificação Push
// ============================================================

async function sendWebPush(endpoint, p256dh, auth, payloadObj, vapidPublicKeyJwk, vapidPrivateKeyJwk) {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payloadObj))
  const clientPubKey = base64UrlDecode(p256dh)
  const authSecret = base64UrlDecode(auth)

  // Cifra o payload
  const encryptedBody = await webPushEncrypt(payloadBytes, clientPubKey, authSecret)

  // Cria VAPID JWT de autenticação
  const vapidJwt = await createVapidJwt(endpoint, vapidPrivateKeyJwk)

  // Converte JWK pública → raw uncompressed (65 bytes) → base64url
  const pubJwk = typeof vapidPublicKeyJwk === 'string'
    ? JSON.parse(vapidPublicKeyJwk)
    : vapidPublicKeyJwk

  const rawPubKey = concat(
    new Uint8Array([0x04]), // prefixo uncompressed
    base64UrlDecode(pubJwk.x),
    base64UrlDecode(pubJwk.y),
  )
  const kParam = base64UrlEncode(rawPubKey)

  const response = await fetch(endpoint, {
    method: 'POST',
    body: encryptedBody,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      Authorization: `vapid t=${vapidJwt}, k=${kParam}`,
      TTL: '2419200', // 28 dias — máximo permitido
    },
  })

  if (!response.ok) {
    // 410 Gone → subscription expirou/inválida
    if (response.status === 410) throw { statusCode: 410 }
    const text = await response.text()
    throw new Error(`Push send failed (${response.status}): ${text}`)
  }

  return response
}

// ============================================================
// Handlers das Rotas
// ============================================================

/**
 * POST /subscribe
 * Registra ou atualiza uma inscrição push no banco D1.
 */
async function handleSubscribe(request, env) {
  try {
    const body = await request.json()
    const { subscription, preferences } = body

    // Valida campos obrigatórios
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return new Response(JSON.stringify({ error: 'Invalid subscription: endpoint, p256dh, and auth are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const { endpoint, keys } = subscription
    const id = crypto.randomUUID()
    const dailyReminder = preferences?.daily_reminder ?? false
    const nextCycleAlert = preferences?.next_cycle_alert_date ?? null

    await env.DB.prepare(
      `INSERT INTO subscribers (id, endpoint, p256dh, auth, daily_reminder, next_cycle_alert_date)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         daily_reminder = excluded.daily_reminder,
         next_cycle_alert_date = excluded.next_cycle_alert_date`,
    ).bind(id, endpoint, keys.p256dh, keys.auth, dailyReminder, nextCycleAlert).run()

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

/**
 * DELETE /unsubscribe
 * Remove uma inscrição push do banco D1.
 */
async function handleUnsubscribe(request, env) {
  try {
    const { endpoint } = await request.json()

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'endpoint is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    await env.DB.prepare('DELETE FROM subscribers WHERE endpoint = ?').bind(endpoint).run()

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

/**
 * Cron diário (20h UTC)
 * Dispara lembretes para inscrições com daily_reminder=1
 * ou next_cycle_alert_date == hoje.
 */
async function handleScheduled(event, env, ctx) {
  // Verifica se as chaves VAPID estão configuradas
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    console.warn('[Cron] VAPID keys not configured — skipping push dispatch')
    return
  }

  const today = new Date().toISOString().split('T')[0]

  const { results } = await env.DB.prepare(
    `SELECT * FROM subscribers WHERE daily_reminder = 1 OR next_cycle_alert_date = ?`,
  ).bind(today).all()

  if (results.length === 0) return

  const vapidPublicKeyJwk = env.VAPID_PUBLIC_KEY
  const vapidPrivateKeyJwk = env.VAPID_PRIVATE_KEY

  const resultsArray = results // results já é um array

  for (const sub of resultsArray) {
    try {
      const isCycleAlert = sub.next_cycle_alert_date === today

      const payload = isCycleAlert
        ? {
            title: 'Maré',
            body: 'Atenção: A sua menstruação deve chegar nos próximos dias.',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: 'cycle-alert',
          }
        : {
            title: 'Maré',
            body: 'Como você está hoje? Registre no seu diário.',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: 'daily-reminder',
          }

      await sendWebPush(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        payload,
        vapidPublicKeyJwk,
        vapidPrivateKeyJwk,
      )
    } catch (err) {
      // 410 Gone → subscription expirada, remove do banco
      if (err.statusCode === 410) {
        try {
          await env.DB.prepare('DELETE FROM subscribers WHERE id = ?').bind(sub.id).run()
        } catch (_) {
          // Ignora erro na remoção
        }
      } else {
        console.warn(`[Cron] Push failed for ${sub.id}: ${err.message}`)
      }
    }
  }
}

// ============================================================
// Router
// ============================================================

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/subscribe') {
      return handleSubscribe(request, env)
    }

    if (request.method === 'DELETE' && url.pathname === '/unsubscribe') {
      return handleUnsubscribe(request, env)
    }

    return new Response(JSON.stringify({ error: 'Not found', routes: ['POST /subscribe', 'DELETE /unsubscribe'] }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(event, env, ctx))
  },
}
