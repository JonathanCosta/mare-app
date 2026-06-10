import { ref } from 'vue'
import { db } from '../db/database'

const isSubscribed = ref(false)
const isSupported = ref('serviceWorker' in navigator && 'PushManager' in window)

/**
 * Converte uma string base64url para Uint8Array.
 * Necessário para o applicationServerKey do PushManager.
 */
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const WORKER_URL = import.meta.env.VITE_WORKER_URL || ''
  const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

  /**
   * Registra a inscrição push no navegador e envia o token ao Worker.
   * O app continua funcional mesmo se o Worker estiver offline
   * (try/catch em todas as chamadas de fetch).
   */
  async function subscribeToPush() {
    if (!isSupported.value) {
      console.warn('[Push] Navegador não suporta Push API')
      return false
    }

    if (!VAPID_PUBLIC_KEY) {
      console.warn('[Push] VAPID_PUBLIC_KEY não configurada no .env')
      return false
    }

    try {
      // Solicita permissão (dispara o diálogo nativo do navegador)
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.warn('[Push] Permissão negada pelo usuário')
        return false
      }

      const registration = await navigator.serviceWorker.ready

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // Lê preferências do banco local
      const settings = await db.user_settings.get('config')
      const preferences = {
        daily_reminder: settings?.push_enabled || false,
        next_cycle_alert_date: null,
      }

      // Envia ao Worker — falha não quebra o app
      const response = await fetch(`${WORKER_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, preferences }),
      })

      if (response.ok) {
        isSubscribed.value = true
        return true
      }

      const data = await response.json()
      console.warn('[Push] Falha ao registrar no Worker:', data.error || response.status)
      return false
    } catch (err) {
      // Worker offline, rede indisponível, etc. — não crítico
      console.warn('[Push] Subscribe não crítico falhou:', err.message)
      return false
    }
  }

  /**
   * Remove a inscrição push do navegador e do Worker.
   */
  async function unsubscribeFromPush() {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Remove do navegador
        await subscription.unsubscribe()

        // Avisa o Worker (falha não crítica)
        await fetch(`${WORKER_URL}/unsubscribe`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {})
      }

      isSubscribed.value = false
      return true
    } catch (err) {
      console.warn('[Push] Unsubscribe não crítico falhou:', err.message)
      isSubscribed.value = false
      return false
    }
  }

  /**
   * Verifica se já existe uma inscrição push ativa no navegador.
   */
  async function checkSubscription() {
    if (!isSupported.value) {
      isSubscribed.value = false
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      isSubscribed.value = !!subscription
    } catch {
      isSubscribed.value = false
    }
  }

  /**
   * Atualiza a preferência de daily_reminder no Worker.
   * Útil quando o usuário alterna o toggle sem rescrever.
   */
  async function updatePreferences(preferences) {
    if (!isSubscribed.value) {
      // Se não está inscrito, subscribe primeiro
      return await subscribeToPush()
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        isSubscribed.value = false
        return await subscribeToPush()
      }

      await fetch(`${WORKER_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          preferences: {
            daily_reminder: preferences?.daily_reminder ?? false,
            next_cycle_alert_date: preferences?.next_cycle_alert_date ?? null,
          },
        }),
      })
    } catch (err) {
      console.warn('[Push] updatePreferences não crítico falhou:', err.message)
    }
  }

  return {
    isSubscribed,
    isSupported,
    subscribeToPush,
    unsubscribeFromPush,
    checkSubscription,
    updatePreferences,
  }
}
