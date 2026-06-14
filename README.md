
![Maré](public/logo-full.png)

**Acompanhamento de ciclo menstrual com privacidade total.**

[![GitHub Pages Deploy](https://github.com/JonathanCosta/mare-app/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/JonathanCosta/mare-app/actions/workflows/deploy-pages.yml)
[![version](https://img.shields.io/badge/version-0.1.0-blue.svg)](package.json)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-ready-purple.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Offline First](https://img.shields.io/badge/Offline--First-yes-7FA9A4.svg)](docs/arquitetura.md)
[![Vue 3](https://img.shields.io/badge/Vue_3-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

---

## Sobre

Maré é um Progressive Web App (PWA) para o acompanhamento diário do ciclo menstrual, sintomas físicos e humor. A filosofia central do projeto é a **privacidade absoluta**: dados sensíveis de saúde nunca transitam em servidores de terceiros. Todo o armazenamento de histórico e diário ocorre localmente no dispositivo.

O único serviço em nuvem atua como um "despertador cego" para o disparo de notificações push — armazena apenas tokens criptográficos anônimos, sem qualquer associação a dados pessoais ou de ciclo menstrual.

> 🌊 *O app transmite a sensação de um ambiente calmo e seguro. A navegação lembra o movimento da água: contínua, suave e orgânica.*

---

## Funcionalidades

### Calendário Inteligente
- Grade mensal interativa com navegação por swipe
- Dias de menstruação com cor coral sólida (`bg-coral-flow`)
- Dias previstos com destaque suave (`bg-coral-mist`)
- Emoji de humor exibido diretamente no calendário
- Toque em qualquer dia para abrir resumo rápido (Bottom Sheet)

### Diário de Registros
- Salvamento automático a cada interação
- Chips "Relação Sexual", "Medicação" e "Estou menstruada" com toggle visual
- Grade de humor com 5 níveis (Feliz, Disposta, Cansada, Triste, Irritada)
- Campo de notas livre com salvamento automático ao sair do campo
- Seletor de data para registrar dias passados

### Estatísticas e Gráficos
- Gráfico de regularidade — duração dos ciclos ao longo do tempo
- "Onda de Humor" — curva suave que mostra oscilações emocionais durante o ciclo
- Filtros para visualizar últimos 3 ou 6 ciclos

### Privacidade Total
- 100% offline-first — dados salvos apenas no IndexedDB local
- Nunca enviamos dados de ciclo para servidores
- Notificações push opcionais via Worker "cego" (apenas tokens, sem dados de saúde)
- Export e import de dados via JSON (você controla seu backup)

### Configurações
- Ajuste de duração média do ciclo e menstruação
- Ativação de lembretes diários e alertas de ciclo
- Backup completo: exportar e importar dados

### PWA
- Instalável na tela inicial (Add to Home Screen)
- Funciona offline — mesmo sem internet
- Atualização automática do Service Worker
- Tema Maré com cores suaves e transições orgânicas

---

## Capturas de Tela

> *As imagens serão adicionadas conforme o desenvolvimento avança.*

| Tela | Descrição |
|------|-----------|
| HomeView | Calendário mensal com indicadores de menstruação e humor |
| LogView | Diário de registros com mood picker e auto-save |
| StatsView | Gráficos de regularidade e onda de humor |
| SettingsView | Configurações de ciclo, notificações e backup |
| Bottom Sheet | Resumo rápido do dia ao tocar no calendário |

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Framework | Vue 3 (Composition API + `<script setup>`) | ^3.5 |
| Build tool | Vite | ^8.0 |
| Estilização | Tailwind CSS | ^3.4 |
| Roteamento | vue-router | ^4.6 |
| Banco local | Dexie.js (IndexedDB) | ^4.0 |
| Gráficos | vue-chartjs + Chart.js | ^5.3 + ^4.4 |
| Datas | date-fns | ^3.6 |
| PWA | vite-plugin-pwa | ^1.3 |
| Testes | Vitest + @vue/test-utils + jsdom | ^4.1 |
| Notificações | Cloudflare Workers + D1 (SQLite) | — |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                   Navegador (PWA)                    │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ HomeView │  │ LogView  │  │   StatsView      │   │
│  │ (Calen-  │  │ (Diário  │  │   (Gráficos)     │   │
│  │  dário)  │  │  + Mood) │  │                  │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│  ┌──────────────────────────────────────────────┐    │
│  │           BottomNav (4 rotas)                 │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │         Dexie.js (IndexedDB)                 │    │
│  │  ┌───────────┐ ┌────────┐ ┌────────────┐    │    │
│  │  │ cycles    │ │daily_  │ │user_       │    │    │
│  │  │           │ │logs    │ │settings    │    │    │
│  │  └───────────┘ └────────┘ └────────────┘    │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │ POST /subscribe
                       │ DELETE /unsubscribe
                       ▼
┌─────────────────────────────────────────────────────┐
│           Cloudflare Worker (maré-push-worker)       │
│                                                      │
│  ┌──────────┐  ┌─────────────────┐                   │
│  │ index.js │  │ D1 (SQLite)     │                   │
│  │ Router   │  │ subscribers     │                   │
│  │ Cron     │  │ - endpoint      │                   │
│  │ Encrypt  │  │ - p256dh        │                   │
│  │ VAPID    │  │ - auth          │                   │
│  └──────────┘  │ - daily_reminder │                   │
│                │ - cycle_alert    │                   │
│                └─────────────────┘                   │
└──────────────────────┬──────────────────────────────┘
                       │ POST (Web Push encrypted)
                       ▼
┌─────────────────────────────────────────────────────┐
│  Push Service (FCM / Apple APNs / Mozilla Autopush)  │
└─────────────────────────────────────────────────────┘
```

---

## Como Rodar Localmente

### Pré-requisitos

- Node.js 22+
- npm

### Setup Rápido

```bash
# Clone o repositório
git clone https://github.com/JonathanCosta/mare-app.git
cd mare-app

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

O servidor roda em `http://localhost:5173` por padrão.

### Build de Produção

```bash
npm run build
npm run preview
```

---

## Estrutura do Projeto

```
mare-app/
├── src/
│   ├── assets/               # CSS global (main.css)
│   ├── components/           # BottomNav, CalendarGrid, BottomSheet, OnboardingModal
│   ├── composables/          # useDatabase, useCycleLogic, useBackup, usePushNotifications
│   ├── db/                   # Instância Dexie.js + schema
│   ├── router/               # Configuração Vue Router (4 rotas)
│   ├── views/                # HomeView, LogView, StatsView, SettingsView
│   ├── App.vue               # App Shell com transições fade-slide
│   └── main.js               # Entry point
├── functions/                # Cloudflare Worker (index.js, schema.sql)
├── public/                   # Ícones, logo, PWA assets, offline.html
├── docs/                     # Documentação técnica
├── .github/workflows/        # CI/CD — deploy automático GitHub Pages
├── .env.example              # Variáveis de ambiente (referência)
├── tailwind.config.js        # Paleta Maré (sand-light, ocean-deep, coral-flow, coral-mist, aqua-calm)
├── vite.config.js            # Vite + PWA plugin + base path
└── package.json
```

---

## Views e Componentes

### HomeView — O Calendário
- Cabeçalho dinâmico: exibe o dia do ciclo ou dias até a próxima menstruação
- Grade mensal interativa via `CalendarGrid` com navegação swipe (horizontal > 50px)
- Dias de menstruação atuais: fundo `bg-coral-flow`
- Dias de menstruação previstos: borda tracejada
- Dias com registro de humor: emoji do humor abaixo do número
- Ao tocar num dia: `BottomSheet` abre com resumo da data e botão "Adicionar/Editar Registro"
- Onboarding automático no primeiro uso

### LogView — Diário de Registros
- Seletor de data no topo (aceita query param `?date=YYYY-MM-DD`)
- Chips toggle: Relação Sexual, Medicação, Estou menstruada
- Grade de humor com 5 níveis (😊 💪 😴 😢 😤)
- Campo de notas (textarea) com auto-save no blur
- Salvamento automático com feedback via toast "Salvo na sua maré"

### StatsView — Estatísticas (vue-chartjs)
- Filtro "Últimos 3 ciclos" / "Últimos 6 ciclos"
- **Gráfico de Barras** — Duração de cada ciclo completo
- **Gráfico de Linhas (Onda de Humor)** — Oscilação emocional com `tension: 0.4` para curvas suaves

### SettingsView — Configurações
- **Ciclo:** Duração média do ciclo (21–45) e menstruação (2–10)
- **Notificações:** Toggle para lembrete diário e alerta de ciclo
- **Dados:** Exportar (JSON via Blob download) e Importar (file input)

### Componentes Compartilhados
- **`BottomNav.vue`** — Navegação inferior fixa com 4 ícones (calendário, lápis, gráfico, engrenagem)
- **`CalendarGrid.vue`** — Grade `grid-cols-7` com swipe, 42 células, dias fantasma opacos
- **`BottomSheet.vue`** — Modal inferior com transição slide-up e overlay semi-transparente
- **`OnboardingModal.vue`** — Tela de boas-vindas no primeiro uso

---

## Paleta de Cores Maré

| Token | Hex | Uso |
|-------|-----|-----|
| `bg-sand-light` | `#F8F6F2` | Fundo principal, areia clara |
| `text-ocean-deep` | `#1E2D38` | Texto e ícones, profundidade do oceano |
| `bg-coral-flow` | `#E08585` | Dias de menstruação, coral suave |
| `bg-coral-mist` | `#F2D1D1` | Dias previstos, névoa de coral |
| `bg-aqua-calm` | `#7FA9A4` | Destaques, humor, ações, verde água |

---

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento Vite (hot reload) |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run test` | Rodar suite de testes (Vitest) |
| `npm run lint` | ESLint + formatação |

---

## Testes

O projeto utiliza **Vitest** com jsdom e `@vue/test-utils`. São **7 arquivos de teste** (63 testes):

```
src/
├── components/__tests__/
│   ├── CalendarGrid.spec.js
│   └── OnboardingModal.spec.js
├── composables/__tests__/
│   ├── useCycleLogic.spec.js
│   └── useDatabase.spec.js
├── db/__tests__/
│   └── database.spec.js
└── views/__tests__/
    ├── HomeView.spec.js
    └── LogView.spec.js
```

```bash
npm run test
npx vitest run --coverage  # com relatório de cobertura
```

---

## Cloudflare Worker (Notificações Push)

O Worker é o único componente em nuvem do Maré. Ele opera como um **despertador cego**: não armazena dados de ciclo, humor, sintomas ou qualquer informação de saúde. Mantém apenas tokens de inscrição push anônimos para disparar lembretes.

> O app funciona 100% offline mesmo se o Worker estiver indisponível. Notificações push são um adicional não crítico.

### Rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/subscribe` | Registra ou atualiza inscrição push no D1 |
| `DELETE` | `/unsubscribe` | Remove inscrição push do D1 |
| Cron | `0 20 * * *` | Dispara notificações via Web Push API |

### Payloads Enviados

| Tipo | Condição | Mensagem |
|------|----------|----------|
| Lembrete diário | `daily_reminder = true` | "Como você está hoje? Registre no seu diário." |
| Alerta de ciclo | `next_cycle_alert_date == hoje` | "Atenção: A sua menstruação deve chegar nos próximos dias." |

### Pré-requisitos

- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)
- Conta Cloudflare com Workers e D1 habilitados
- Par de chaves VAPID

### Setup e Deploy

```bash
# 1. Gerar chaves VAPID
npx web-push generate-vapid-keys --json

# 2. Criar banco D1
npx wrangler d1 create mare-db
# → Copie o database_id gerado

# 3. Executar schema
npx wrangler d1 execute mare-db --file=functions/schema.sql --remote

# 4. Configurar secrets (chaves VAPID em formato JWK)
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put VAPID_PUBLIC_KEY

# 5. Deploy
cd functions
npx wrangler deploy
```

> ⚠️ **Nunca commite o `wrangler.toml` com o `database_id` real.** Mantenha esse arquivo no `.gitignore`.

### Schema do D1

```sql
CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  daily_reminder BOOLEAN DEFAULT 0,
  next_cycle_alert_date TEXT
);

CREATE INDEX IF NOT EXISTS idx_daily_reminder ON subscribers(daily_reminder);
CREATE INDEX IF NOT EXISTS idx_cycle_alert ON subscribers(next_cycle_alert_date);
```

---

## Variáveis de Ambiente

O arquivo `.env.example` contém a referência das variáveis necessárias:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_WORKER_URL` | Não (push opcional) | URL do Cloudflare Worker |
| `VITE_VAPID_PUBLIC_KEY` | Não (push opcional) | Chave pública VAPID (base64url) |

Nenhuma variável é obrigatória para o funcionamento offline do app. Sem elas, apenas notificações push deixam de funcionar.

> ⚠️ As variáveis `VITE_*` são embutidas no bundle JS em tempo de build e ficam visíveis no código-fonte do frontend. Isso é seguro por design: a chave pública VAPID é propositalmente pública (RFC 8292), e a URL do Worker é protegida por validação de endpoint e CORS restrito no servidor. A chave **privada** VAPID nunca sai dos secrets do Cloudflare Worker.

---

## Privacidade e Segurança

**Maré é offline-first por construção.** Seus dados de ciclo menstrual, humor, sintomas e notas pessoais nunca saem do seu dispositivo.

### Seus Dados

| O que | Onde fica | Sai do dispositivo? |
|-------|-----------|---------------------|
| Datas de início e fim do ciclo | IndexedDB (Dexie.js) local | ❌ Não |
| Humor, sintomas, relação sexual, medicação | IndexedDB (Dexie.js) local | ❌ Não |
| Notas do diário | IndexedDB (Dexie.js) local | ❌ Não |
| Configurações de ciclo | IndexedDB (Dexie.js) local | ❌ Não |
| Preferência de notificação (booleano) | IndexedDB + Worker | ✅ Sim — apenas o valor |
| Token de inscrição push | Worker Cloudflare D1 | ✅ Sim — apenas endpoint criptográfico |

### Infraestrutura

O único componente em nuvem é um **Worker Cloudflare** especializado em notificações push. Ele opera de forma **"cega"**: não sabe seu nome, e-mail ou qualquer dado de saúde. O banco D1 armazena apenas:

- O endpoint fornecido pelo serviço de push do seu navegador (FCM/Apple/Mozilla)
- As chaves criptográficas necessárias para cifrar a notificação (p256dh, auth)
- Duas preferências booleanas/data: `daily_reminder` e `next_cycle_alert_date`

Nenhuma dessas informações permite identificar quem você é ou reconstruir seu ciclo menstrual. O banco D1 não possui acesso externo — somente o próprio Worker pode consultá-lo.

### Medidas de Proteção

| Medida | Descrição |
|--------|-----------|
| **Content Security Policy (CSP)** | O `index.html` define CSP restritiva (`default-src 'self'`) que bloqueia scripts externos e rastreadores. Apenas o Worker de notificações está na whitelist de `connect-src`. |
| **Validação de endpoint push** | O Worker só aceita endpoints dos serviços oficiais de push (Google FCM, Apple Push, Mozilla Autopush). Endpoints desconhecidos são rejeitados. |
| **Encriptação Web Push (RFC 8188)** | Notificações cifradas ponta-a-ponta usando `aes128gcm` com chave efêmera ECDH P-256. |
| **VAPID (RFC 8292)** | Autenticação do Worker junto aos serviços de push com assinatura ECDSA ES256. Chave privada armazenada como secret do Worker. |
| **CORS restrito** | O Worker só aceita requisições de origens conhecidas (GitHub Pages e localhost). |
| **Export exige ação explícita** | Backup só é gerado quando você clica em "Exportar" nas configurações. |
| **Sem analytics ou telemetria** | O app não coleta métricas de uso, não envia dados para terceiros e não utiliza cookies ou rastreadores. |

### Transparência

- **Criptografia local:** O IndexedDB não é criptografado pelo app — é protegido pelo sandbox do navegador. Considere ativar criptografia em nível de SO no seu dispositivo.
- **Metadados Cloudflare:** Embora o Worker não armazene dados pessoais, a Cloudflare tem acesso a metadados de conexão. Consulte a [política de privacidade da Cloudflare](https://www.cloudflare.com/privacypolicy/).
- **Código aberto:** Você pode auditar cada camada de segurança no [repositório](https://github.com/JonathanCosta/mare-app).

---

## Deploy

### GitHub Pages (Frontend)

O deploy do frontend é automático via GitHub Actions. Ao fazer push na branch `main`, o workflow:

1. Instala dependências (`npm ci`)
2. Faz o build de produção (`npm run build`)
3. Faz upload do diretório `dist` como artifact
4. Faz deploy para GitHub Pages

Para o deploy funcionar, configure os seguintes **Secrets** no repositório (Settings → Secrets → Actions):

| Secret | Valor |
|--------|-------|
| `VITE_WORKER_URL` | URL do Cloudflare Worker |
| `VITE_VAPID_PUBLIC_KEY` | Chave pública VAPID (base64url) |

### Cloudflare Worker (Notificações)

```bash
cd functions
npx wrangler deploy
```

---

## Documentação

- [Arquitetura](docs/arquitetura.md) — Stack, modelagem, decisões técnicas
- [Design & UX](docs/design.md) — Conceito "Maré", paleta, diretrizes visuais
- [Plano Técnico](docs/mare_plano.md) — Passo a passo da execução

---

## Contribuição

Contribuições são bem-vindas! Siga os passos abaixo:

1. **Fork** o repositório
2. Crie uma **branch** descritiva (`feat/nova-funcionalidade`, `fix/correcao-bug`, etc.)
3. Faça seus **commits** seguindo [Conventional Commits](https://www.conventionalcommits.org/)
4. Abra um **Pull Request** para a branch `main`

### Conventional Commits

| Tipo | Exemplo |
|------|---------|
| `feat:` | `feat: add mood history chart` |
| `fix:` | `fix: calendar swipe on iOS` |
| `db:` | `db: add cycle_notes table` |
| `worker:` | `worker: add daily reminder cron` |
| `docs:` | `docs: update README setup steps` |
| `test:` | `test: add useCycleLogic specs` |
| `refactor:` | `refactor: extract mood mapper` |

### Revisão de Segurança

Todo código que lida com dados de ciclo passa por revisão obrigatória:
- Dados de saúde nunca são enviados para servidores
- Notificações push usam Worker anônimo (apenas tokens)
- `console.log` não expõe dados sensíveis
- Backup requer ação explícita da usuária

> ⚠️ Dados de ciclo menstrual são sensíveis. O projeto segue LGPD/GDPR. Leia [docs/arquitetura.md](docs/arquitetura.md) para entender as decisões de privacidade.

---

## Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais informações.

---

<p align="center">🌊 <strong>Maré — A vida em ciclos</strong> 🌊</p>
