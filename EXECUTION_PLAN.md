# Plano de Execução — Maré PWA

> App de Ciclo Menstrual | Vue 3 + Vite + Tailwind + Dexie.js + PWA + Cloudflare Worker

---

## 📊 Índice de Progresso

| # | Estágio | Status | Responsável | Mensagem de Commit |
|---|---------|--------|-------------|-------------------|
| 1 | Scaffold do Projeto | ⬜ | `@dev` (skill:load docker-setup) | `feat: scaffold Vite + Vue 3 + Tailwind + PWA` |
| 2 | Camada de Dados (Dexie) | ⬜ | `@db` (skill:load cycle-prediction) | `db: schema Dexie + composables CRUD` |
| 3 | App Shell & Navegação | ⬜ | `@dev` + `@design` | `feat: App Shell + BottomNav + router` |
| 4 | HomeView (Calendário) | ⬜ | `@dev` + `@design` | `feat: HomeView com calendário e indicadores` |
| 5 | LogView (Diário) | ⬜ | `@dev` + `@design` | `feat: LogView com auto-save e mood picker` |
| 6 | StatsView (Gráficos) | ⬜ | `@dev` + `@design` | `feat: StatsView com gráficos Chart.js` |
| 7 | SettingsView & Backup | ⬜ | `@db` (skill:load backup-restore) + `@dev` | `feat: SettingsView + export/import dados` |
| 8 | Cloudflare Worker | ⬜ | `@worker` (skill:load push-notification) | `worker: notificações push + D1 + cron` |
| 9 | PWA Final & Offline | ⬜ | `@pwa` + `@design` | `pwa: manifest, SW, ícones e suporte offline` |

---

## 🔄 Ciclo de Cada Estágio

```
[ Execução ] → [ Teste local ] → [ @security review ] → [ Commit ]
```

Cada estágio segue este fluxo obrigatório:
1. **Execução** pelo agente responsável
2. **Teste local** — verificar se funciona (`npm run dev`)
3. **Revisão de segurança** por `@security` (read-only)
4. **Commit** com mensagem conventional commit
5. **Atualizar** o índice de progresso neste arquivo (⬜ → ✅)

> Regra: só avança para o próximo estágio quando o anterior estiver commitado.

---

## Estágio 1 — Scaffold do Projeto

**Responsável:** `@dev`
**Skills:** `skill:load docker-setup`
**Arquivos envolvidos:** `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.js`, `src/App.vue`, `src/assets/main.css`, `public/icons/`

### Tarefas
- [ ] Inicializar Vite + Vue 3 (`npm create vite@latest . -- --template vue`)
- [ ] Instalar deps: `dexie`, `tailwindcss`, `postcss`, `autoprefixer`, `vue-chartjs`, `chart.js`, `date-fns`
- [ ] Instalar devDeps: `vite-plugin-pwa`
- [ ] Configurar `tailwind.config.js` com paleta Maré:
  - `bg-sand-light`: `#F8F6F2`
  - `text-ocean-deep`: `#1E2D38`
  - `bg-coral-flow`: `#E08585`
  - `bg-coral-mist`: `#F2D1D1`
  - `bg-aqua-calm`: `#7FA9A4`
- [ ] Configurar `vite.config.js` com `vite-plugin-pwa` (básico)
- [ ] Criar estrutura de pastas: `src/views/`, `src/components/`, `src/composables/`, `src/db/`, `src/assets/`, `public/icons/`
- [ ] Adicionar CSS base em `src/assets/main.css` (fontes, reset suave)
- [ ] Adicionar meta tags mobile no `index.html`

### Verificação
- `npm run dev` sobe sem erros
- Tailwind classes customizadas funcionam (`bg-sand-light`, etc.)
- PWA plugin aparece no build (`npm run build`)

### Segurança (`@security`)
- [ ] `.env` está no `.gitignore`
- [ ] Nenhum dado sensível no boilerplate
- [ ] `index.html` sem scripts de tracking/analytics

### Commit
```
feat: scaffold Vite + Vue 3 + Tailwind + PWA
```

---

## Estágio 2 — Camada de Dados (Dexie.js)

**Responsável:** `@db`
**Skills:** `skill:load cycle-prediction`
**Arquivos envolvidos:** `src/db/database.js`, `src/composables/useDatabase.js`, `src/composables/useCycleLogic.js`, `src/composables/useBackup.js`

### Tarefas
- [ ] Criar `src/db/database.js` com schema Dexie:
  - `user_settings`: `'id'` — id='config', average_cycle_length, average_period_length, push_enabled
  - `cycles`: `'++id, start_date, end_date'` — predicted_next_start
  - `daily_logs`: `'date, cycle_id, mood'` — had_sex, took_medication, notes
- [ ] Populate: inserir `user_settings` default (28 dias, 5 dias, push=false)
- [ ] Criar `src/composables/useDatabase.js` com operações:
  - `getSettings()` / `updateSettings(settings)`
  - `getCycles()` / `addCycle(startDate)` / `closeCycle(id, endDate)`
  - `getLog(date)` / `saveLog(entry)`
  - `getLogsByCycle(cycleId)`
- [ ] Criar `src/composables/useCycleLogic.js` com regras de negócio:
  - `predictNextCycle()` — média móvel dos últimos 3 ciclos
  - `getCurrentCycleInfo()` — dia atual, status
  - `getCycleDays(cycleId)` — lista de dias do ciclo
- [ ] Criar `src/composables/useBackup.js`:
  - `exportData()` — Dexie → JSON → Blob download
  - `importData(file)` — file input → JSON → Dexie (clear + bulkAdd)

### Verificação
- Importar módulos sem erro
- `addCycle` + `getCycles` retornam dados consistentes
- `predictNextCycle` retorna número válido
- `exportData` gera JSON com todas as tabelas
- `importData` restaura dados corretamente

### Segurança (`@security`)
- [ ] Nenhum `console.log` expõe dados de ciclo
- [ ] Backup exporta apenas com ação explícita
- [ ] Nenhuma requisição de rede parte dos composables

### Commit
```
db: schema Dexie + composables CRUD
```

---

## Estágio 3 — App Shell & Navegação

**Responsável:** `@dev` + `@design`
**Arquivos envolvidos:** `src/router/index.js`, `src/components/BottomNav.vue`, `src/App.vue`, `src/main.js`, `src/views/{Home,Log,Stats,Settings}View.vue`

### Tarefas
- [ ] Instalar `vue-router@4`
- [ ] Criar `src/router/index.js` com 4 rotas: `/`, `/log`, `/stats`, `/settings`
- [ ] Criar `src/components/BottomNav.vue`:
  - 4 abas com ícones (calendário, diário, gráfico, engrenagem)
  - Destaque visual na rota ativa
  - Tema Maré: `bg-sand-light`, `text-ocean-deep`
- [ ] Criar `src/App.vue` como App Shell:
  - `<router-view>` com transição fade
  - BottomNav fixa no final
  - `pb-20` para não sobrepor conteúdo
- [ ] Placeholder views (conteúdo mínimo "Em breve")
- [ ] Configurar `main.js` com router + mount

### Verificação
- Navegação entre 4 rotas funciona
- BottomNav destaca aba ativa
- Transição suave entre telas
- Viewport 375px não quebra layout

### Segurança (`@security`)
- [ ] Rotas não expõem dados em query params
- [ ] CSP básica no index.html

### Commit
```
feat: App Shell + BottomNav + router
```

---

## Estágio 4 — HomeView (Calendário)

**Responsável:** `@dev` + `@design`
**Arquivos envolvidos:** `src/components/CalendarGrid.vue`, `src/components/BottomSheet.vue`, `src/views/HomeView.vue`

### Tarefas
- [ ] Criar `src/components/CalendarGrid.vue`:
  - Grade mensal 7 colunas, sem linhas divisórias (apenas `gap-2`)
  - Swipe horizontal para trocar mês (touchstart/touchend)
  - Setas de navegação (esquerda/direita)
  - Indicadores visuais:
    - `bg-coral-flow` para menstruação registrada
    - `bg-coral-mist` para menstruação prevista
    - Emoji do humor abaixo do número
    - Hoje destacado com `bg-aqua-calm`
  - Dias com `rounded-xl`, sem bordas
- [ ] Criar `src/components/BottomSheet.vue`:
  - Modal que "sobe como maré" (transform translateY + duration-300)
  - Overlay semitransparente
  - Cantos `rounded-2xl`
  - Resumo da data (status, humor)
  - Botão "Adicionar/Editar Registro" → router para LogView
- [ ] Implementar `HomeView.vue`:
  - Header dinâmico: "Dia X do ciclo" / "Menstruação em Y dias"
  - CalendarGrid como componente central
  - Toque em dia → BottomSheet
  - Usar `date-fns` para manipulação de datas
  - Dados vindos de `useCycleLogic` + `useDatabase`

### Verificação
- Calendário renderiza mês atual
- Swipe ou setas trocam meses
- Cores dos dias aparecem conforme dados
- BottomSheet sobe com animação suave
- Toque em dia abre BottomSheet com info correta

### Segurança (`@security`)
- [ ] Nenhum dado de ciclo em URLs ou console
- [ ] BottomSheet só exibe dados do banco local

### Commit
```
feat: HomeView com calendário e indicadores
```

---

## Estágio 5 — LogView (Diário)

**Responsável:** `@dev` + `@design`
**Arquivos envolvidos:** `src/views/LogView.vue`

### Tarefas
- [ ] Header com seletor de data (padrão: hoje, clicável para dias anteriores)
- [ ] Chips "Relação Sexual" e "Medicação":
  - Formato pílula (`rounded-full`)
  - Toggle visual: ativo = cor do tema, inativo = cinza claro
  - Salva automaticamente no clique
- [ ] Grade de humor com 5 emojis (mapear e salvar como valores numéricos no `daily_logs` para alimentar o Chart.js):
  - Feliz 😊 (5)
  - Disposta 💪 (4)
  - Cansada 😴 (3)
  - Triste 😢 (2)
  - Irritada 😤 (1)
  - Seleção visual com destaque (`bg-aqua-calm`)
- [ ] Textarea para notas (salva no blur)
- [ ] Auto-save: `db.daily_logs.put()` a cada interação
- [ ] Toast "Salvo na sua maré" com fade-out (2s)
- [ ] Carregar dados existentes ao abrir data já registrada

### Verificação
- Chips alternam estado e persistem
- Seleção de humor persiste ao recarregar
- Notas salvam no blur
- Toast aparece discretamente
- Mudar data carrega registro correto

### Segurança (`@security`)
- [ ] `had_sex` / `took_medication` não vazam em logs
- [ ] Auto-save é 100% local (IndexedDB)

### Commit
```
feat: LogView com auto-save e mood picker
```

---

## Estágio 6 — StatsView (Gráficos)

**Responsável:** `@dev` + `@design`
**Arquivos envolvidos:** `src/views/StatsView.vue`

### Tarefas
- [ ] Configurar `vue-chartjs` com Chart.js
- [ ] **Gráfico de Regularidade (Bar Chart):**
  - Eixo X: ciclos
  - Eixo Y: duração em dias
  - Cor: `#7FA9A4` (aqua-calm)
- [ ] **Gráfico Onda de Humor (Line Chart):**
  - Eixo X: dias do ciclo
  - Eixo Y: humor (valores numéricos: feliz=5, disposta=4, cansada=3, triste=2, irritada=1)
  - `tension: 0.4` para curva suave (onda)
  - Cor da linha: `#7FA9A4`
  - Preenchimento suave abaixo da linha
- [ ] Filtros: "Últimos 3 ciclos" / "Últimos 6 ciclos"
- [ ] Dados do Dexie via `useDatabase`

### Verificação
- Gráficos renderizam com dados reais ou mock
- Filtro altera dados corretamente
- Curva do humor é suave (tension 0.4)
- Responsivo em tela pequena (scroll horizontal se necessário)

### Segurança (`@security`)
- [ ] Dados de humor não aparecem em URLs
- [ ] Gráficos renderizados localmente

### Commit
```
feat: StatsView com gráficos Chart.js
```

---

## Estágio 7 — SettingsView & Backup

**Responsável:** `@db` (skill:load backup-restore) + `@dev`
**Arquivos envolvidos:** `src/views/SettingsView.vue`

### Tarefas
- [ ] Seção "Ciclo":
  - Input numérico: Duração média (padrão 28)
  - Input numérico: Duração da menstruação (padrão 5)
  - Salvar em `db.user_settings.put()`
- [ ] Seção "Notificações":
  - Toggle Switch "Lembretes diários"
  - Toggle Switch "Alerta de ciclo"
  - (UI apenas — subscribe real é no estágio 8)
- [ ] Seção "Dados":
  - Botão "Exportar Dados" → `exportData()` → download .json
  - Botão "Importar Dados" → `<input type="file" accept=".json">` → `importData(file)`
- [ ] Estilo: cards `rounded-2xl`, sombras suaves, inputs grandes (touch-friendly)

### Verificação
- Alterar config persiste e reflete no app
- Export gera JSON com todas as tabelas
- Import restaura dados de JSON válido
- Import limpa dados antigos antes de popular

### Segurança (`@security`)
- [ ] Export/Import só com clique explícito
- [ ] Valida estrutura do JSON antes de importar
- [ ] Arquivo baixado localmente, nunca enviado

### Commit
```
feat: SettingsView + export/import dados
```

---

## Estágio 8 — Cloudflare Worker

**Responsável:** `@worker` (skill:load push-notification)
**Arquivos envolvidos:** `functions/index.js`, `functions/schema.sql`, `functions/wrangler.toml`, `src/composables/usePushNotifications.js`

### Tarefas
- [ ] Executar `npx wrangler d1 create mare-db` no terminal para gerar o banco e copiar o `database_id`.
- [ ] Criar `functions/schema.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    daily_reminder BOOLEAN DEFAULT 0,
    next_cycle_alert_date TEXT
  );
  ```
- [ ] Criar `functions/wrangler.toml`:
  - name = "mare-push-worker"
  - D1 binding (inserindo o `database_id` gerado no primeiro passo)
  - Cron trigger (`0 20 * * *`)
- [ ] Gerar chaves seguras para o Push executando `npx web-push generate-vapid-keys`.
  - Adicionar a **Private Key** como segredo no Worker: `npx wrangler secret put VAPID_PRIVATE_KEY`.
- [ ] Criar `functions/index.js`:
  - `POST /subscribe` — recebe subscription + preferências, `INSERT OR REPLACE` no D1.
  - `scheduled()` — cron diário: query `daily_reminder=1` ou `next_cycle_alert_date=hoje`, envia Web Push assinando com a `VAPID_PRIVATE_KEY`.
  - Tratar HTTP 410 (subscription expirada → remover do D1).
- [ ] Criar `src/composables/usePushNotifications.js`:
  - Configurar a **VAPID Public Key** (gerada anteriormente) nas variáveis de ambiente do front-end (`.env`).
  - `subscribeToPush()` — Service Worker registration + PushManager subscribe.
  - `unsubscribeFromPush()` — remove subscription.
  - `sendSubscriptionToWorker()` — POST para Worker.
  - `urlB64ToUint8Array()` — conversão de VAPID key.

### Verificação
- `wrangler dev` inicia na porta 8787
- POST `/subscribe` retorna 200 com body JSON
- Schema SQL é válido
- Frontend não quebra se Worker estiver offline (try/catch)

### Segurança (`@security`)
- [ ] Worker NUNCA recebe dados de ciclo ou saúde
- [ ] Apenas endpoint + chaves VAPID no D1
- [ ] Se Worker offline, app continua funcional
- [ ] Comunicação via HTTPS

### Commit
```
worker: notificações push + D1 + cron
```

---

## Estágio 9 — PWA Final & Offline

**Responsável:** `@pwa` + `@design`
**Arquivos envolvidos:** `vite.config.js`, `public/icons/`, `public/offline.html`, `index.html`

### Tarefas
- [ ] Finalizar `vite.config.js` com `vite-plugin-pwa`:
  - `registerType: 'autoUpdate'`
  - `workbox.globPatterns: ['**/*.{js,css,html,svg,png,ico,json}']`
  - Manifest inline: `name: 'Maré'`, `short_name: 'Maré'`
  - `theme_color: '#7FA9A4'`, `background_color: '#F8F6F2'`
  - `display: 'standalone'`, `orientation: 'portrait'`
- [ ] Criar ícones:
  - 192x192, 512x512 (PNG ou SVG)
  - maskable icon
  - apple-touch-icon 180x180
- [ ] Criar `public/offline.html` — página de fallback offline amigável
- [ ] Adicionar meta tags no `index.html`:
  - `<meta name="theme-color" content="#7FA9A4">`
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<link rel="apple-touch-icon" href="/icons/icon-180x180.png">`
  - CSP: `<meta http-equiv="Content-Security-Policy" content="...">`

### Verificação
- `npm run build` gera `dist/` com service worker + precache manifest
- Lighthouse `check_pwa_readiness` passa (score > 80)
- App abre offline (devtools → network → offline)
- "Add to Home Screen" aparece no Chrome mobile
- Navegação completa funciona offline

### Segurança (`@security`)
- [ ] CSP configurada: `default-src 'self'; script-src 'self'; connect-src 'self' https://*.workers.dev`
- [ ] SW cacheia apenas assets estáticos, NUNCA dados de ciclo
- [ ] Nenhum analytics externo ou tracking

### Commit
```
pwa: manifest, SW, ícones e suporte offline
```

---

## Final: Integração e Build

```bash
git pull origin main --rebase
npm run build
npm run preview
```

### Checklist Final
- [ ] `@security` — revisão completa de privacidade em todo código
- [ ] `@pwa` — `/audit:pwa` no build de produção
- [ ] `@test` — testes passam (quando implementados)
- [ ] `@design` — paleta Maré consistente em todas as telas
- [ ] `@docs` — `README.md` atualizado com instruções de uso

---

## Resumo de Agentes por Estágio

```
Estágio  │ Agente(s)                    │ Skill                        │ MCP
─────────┼──────────────────────────────┼──────────────────────────────┼──────────
1        │ @dev                         │ docker-setup                 │ —
2        │ @db                          │ cycle-prediction             │ —
3        │ @dev + @design               │ —                            │ —
4        │ @dev + @design               │ —                            │ —
5        │ @dev + @design               │ —                            │ —
6        │ @dev + @design               │ —                            │ —
7        │ @db + @dev                   │ backup-restore               │ —
8        │ @worker                      │ push-notification            │ —
9        │ @pwa + @design               │ —                            │ lighthouse
─────────┼──────────────────────────────┼──────────────────────────────┼──────────
Review   │ @security (todos estágios)   │ —                            │ —
Final    │ @git (commits)               │ —                            │ —
```

---

## Regras

1. **Nunca pular etapas** — cada estágio é executado, testado, revisado e commitado
2. **`@security` é obrigatório** em todos os estágios (read-only, edit: deny)
3. **Commits atômicos** — um estágio = um commit com mensagem conventional commit
4. **`git pull` só no final** — após todos os 9 estágios commitados
5. **Atualizar este arquivo** após cada estágio concluído (⬜ → ✅)
