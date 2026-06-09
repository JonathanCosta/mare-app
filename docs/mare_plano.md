

## 🛠️ Plano Técnico de Execução: App de Ciclo Menstrual PWA | Maré - A vida em ciclos

**Visão Arquitetural:**
Aplicação Front-end desacoplada (Vue 3 + Vite), operando no paradigma *Offline-First* com persistência local via IndexedDB (Dexie.js). O Back-end é estritamente voltado para mensageria de push notifications, utilizando arquitetura Serverless (Cloudflare Workers + D1 SQLite), sem armazenamento de dados sensíveis ou de saúde.

---

### 1. Setup e Configuração do Ambiente Front-end

O agente deve inicializar o projeto com Vite, Vue 3, Tailwind CSS e configurar o plugin PWA para garantir o cache offline.

**Comandos de Inicialização Sugeridos:**

```bash
npm create vite@latest app-ciclo -- --template vue
cd app-ciclo
npm install
npm install dexie tailwindcss postcss autoprefixer vue-chartjs chart.js date-fns
npm install -D vite-plugin-pwa
npx tailwindcss init -p

```

**Estrutura de Pastas Exigida (`src/`):**

* `assets/` (Ícones e CSS global)
* `components/` (Componentes reutilizáveis: BottomNav, Modal, CalendarGrid)
* `composables/` (Lógica de negócio: `useDatabase.js`, `useCycleLogic.js`)
* `views/` (Telas principais: HomeView, LogView, StatsView, SettingsView)
* `db/` (Instância e configuração do Dexie.js)
* `App.vue` (App Shell)
* `main.js` (Entry point)

---

### 2. Modelagem e Instância do Banco Local (Dexie.js)

O banco de dados local será a única fonte de verdade para os dados do usuário. O agente deve criar o arquivo `src/db/database.js` com a seguinte estrutura.

**Exemplo de Código (`database.js`):**

```javascript
import Dexie from 'dexie';

export const db = new Dexie('CycleAppDB');

// Definição do Schema (apenas chaves primárias e índices de busca)
db.version(1).stores({
  user_settings: 'id', // id fixo 'config', armazena médias de ciclo
  cycles: '++id, start_date, end_date', // histórico de ciclos
  daily_logs: 'date, cycle_id, mood' // diário (date no formato YYYY-MM-DD)
});

// Populando configurações iniciais caso não existam
db.on('populate', () => {
  db.user_settings.add({
    id: 'config',
    average_cycle_length: 28,
    average_period_length: 5,
    push_enabled: false
  });
});

```

---

### 3. Interface e Interação (Vue 3 + Tailwind CSS)

O desenvolvimento deve focar em *Mobile-First*. O agente utilizará a `Composition API` e `<script setup>`. Abaixo está a diretriz de como criar a tela de registro diário.

**Exemplo de Código - Tela de Diário (`LogView.vue`):**

```html
<script setup>
import { ref, onMounted } from 'vue';
import { db } from '../db/database';

const today = new Date().toISOString().split('T')[0];
const logEntry = ref({
  date: today,
  had_sex: false,
  took_medication: false,
  mood: null, // ex: 'feliz', 'triste', 'irritada'
  notes: ''
});

// Salvar automaticamente no IndexedDB
const saveLog = async () => {
  await db.daily_logs.put(JSON.parse(JSON.stringify(logEntry.value)));
  // Implementar feedback visual leve (Toast "Salvo")
};
</script>

<template>
  <main class="p-4 pb-20">
    <h1 class="text-xl font-bold mb-6">Diário: {{ logEntry.date }}</h1>

    <div class="flex gap-4 mb-6">
      <button 
        @click="logEntry.had_sex = !logEntry.had_sex; saveLog()"
        :class="logEntry.had_sex ? 'bg-pink-500 text-white' : 'bg-gray-200'"
        class="px-4 py-2 rounded-full transition-colors">
        Relação Sexual
      </button>
      <button 
        @click="logEntry.took_medication = !logEntry.took_medication; saveLog()"
        :class="logEntry.took_medication ? 'bg-blue-500 text-white' : 'bg-gray-200'"
        class="px-4 py-2 rounded-full transition-colors">
        Remédio
      </button>
    </div>

    <textarea 
      v-model="logEntry.notes" 
      @blur="saveLog()"
      class="w-full border rounded-lg p-3 mt-4" 
      placeholder="Como foi o seu dia?">
    </textarea>
  </main>
</template>

```

---

### 4. Regras de Negócio e Cálculos (`composables/useCycleLogic.js`)

A lógica de previsão do ciclo deve ser encapsulada. O agente precisará ler as configurações do usuário e calcular a média móvel.

**Lógica Exigida para Previsão:**

1. **Ciclo 1 e 2:** Utilizar o `average_cycle_length` da tabela `user_settings` (padrão 28) somado ao `start_date` atual.
2. **Ciclo 3 em diante:** Executar uma *Query* no Dexie buscando os últimos 3 registros concluídos na tabela `cycles`. Calcular a média de dias entre `start_date` e `end_date` desses 3. Utilizar essa nova média para projetar o próximo `predicted_next_start`.

---

### 5. Infraestrutura de Notificações (Cloudflare Workers + D1)

O agente deve configurar um projeto paralelo para a Cloudflare. O banco SQLite (D1) guardará apenas inscrições anônimas.

**Estrutura do Banco D1 (`schema.sql`):**

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

**Lógica Exigida do Worker (`index.js`):**
O script deve ter duas funções principais:

1. **Método fetch (POST):** Receber a rota `/subscribe`. Extrair os dados da inscrição (endpoint, chaves) e a preferência de notificação do `request.json()`. Fazer o `INSERT OR REPLACE` no banco D1.
2. **Método scheduled (Cron):** Disparado diariamente. O script deve fazer um `SELECT` buscando usuários onde `daily_reminder = 1` OU `next_cycle_alert_date = data_de_hoje`. Para os resultados encontrados, utilizar a Web Push API para enviar o payload correspondente.

**Tabela de Eventos e Payloads:**

| Evento | Condição do D1 | Payload do Push |
| --- | --- | --- |
| Lembrete Diário | `daily_reminder == 1` | "Como você está hoje? Registre no seu diário." |
| Alerta de Ciclo | `next_cycle_alert_date == hoje` | "Atenção: A sua menstruação deve chegar nos próximos dias." |

---

### 6. Exportação e Importação de Dados (Backup)

Na tela `SettingsView.vue`, o agente deve implementar duas funções utilizando a API nativa do navegador:

* **Exportar:** Buscar todas as tabelas (`user_settings`, `cycles`, `daily_logs`) usando `db.export()` (se usar a extensão `dexie-export-import`) ou varrer e converter para JSON puro. Acionar o download gerando um *Blob*.
* **Importar:** Ler um arquivo `.json` via `<input type="file">`, limpar o banco de dados atual (`db.tables.forEach(table => table.clear())`) e popular as tabelas com os novos dados importados.