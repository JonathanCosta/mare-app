<script setup>
import { ref, onMounted } from 'vue'
import { useDatabase } from '../composables/useDatabase'
import { useBackup } from '../composables/useBackup'
import { usePushNotifications } from '../composables/usePushNotifications'

const { getSettings, updateSettings, getCycles } = useDatabase()
const { exportData, importData } = useBackup()
const {
  isSubscribed,
  isSupported,
  subscribeToPush,
  unsubscribeFromPush,
  checkSubscription,
  updatePreferences,
} = usePushNotifications()

const settings = ref({
  average_cycle_length: 28,
  average_period_length: 5,
  push_enabled: false,
  cycle_alert_enabled: false,
})

const fileInput = ref(null)

onMounted(async () => {
  const saved = await getSettings()
  if (saved) settings.value = { ...settings.value, ...saved }
  await checkSubscription()
})

/**
 * Alterna o lembrete diário:
 * - Se ativar → subscribe no navegador + Worker
 * - Se desativar → unsubscribe
 * Em ambos os casos, salva a preferência no banco local.
 */
async function toggleDailyReminder() {
  const newValue = !settings.value.push_enabled

  if (newValue) {
    // Ativar notificações — só altera o toggle se o subscribe for bem-sucedido
    const success = await subscribeToPush()
    if (!success) return false // mantém toggle desligado se falhou
    settings.value.push_enabled = true
  } else {
    // Desativar notificações
    await unsubscribeFromPush()
    settings.value.push_enabled = false
  }

  await updateSettings({
    average_cycle_length: settings.value.average_cycle_length,
    average_period_length: settings.value.average_period_length,
    push_enabled: settings.value.push_enabled,
    cycle_alert_enabled: settings.value.cycle_alert_enabled,
  })
}

/**
 * Alterna o alerta de ciclo:
 * Calcula a data prevista e envia ao Worker.
 */
async function toggleCycleAlert() {
  const newValue = !settings.value.cycle_alert_enabled

  if (newValue) {
    // Calcula a data de alerta (3 dias antes do próximo ciclo previsto)
    const cycles = await getCycles()
    let alertDate = null

    if (cycles.length > 0) {
      const lastCycle = cycles[0] // mais recente (ordenado por start_date desc)
      if (lastCycle.predicted_next_start) {
        const predictedDate = new Date(lastCycle.predicted_next_start)
        predictedDate.setDate(predictedDate.getDate() - 3)
        alertDate = predictedDate.toISOString().split('T')[0]
      }
    }

    // Se já está inscrito, atualiza preferência com data
    if (isSubscribed.value) {
      await updatePreferences({
        daily_reminder: settings.value.push_enabled,
        next_cycle_alert_date: alertDate,
      })
    } else {
      // Se não está inscrito, subscribe primeiro
      const success = await subscribeToPush()
      if (!success) return false // mantém toggle desligado se falhou
      if (alertDate) {
        await updatePreferences({
          daily_reminder: settings.value.push_enabled,
          next_cycle_alert_date: alertDate,
        })
      }
    }

    settings.value.cycle_alert_enabled = true
  } else {
    // Desativa alerta — atualiza preferência sem data
    if (isSubscribed.value) {
      await updatePreferences({
        daily_reminder: settings.value.push_enabled,
        next_cycle_alert_date: null,
      })
    }
    settings.value.cycle_alert_enabled = false
  }

  await updateSettings({
    average_cycle_length: settings.value.average_cycle_length,
    average_period_length: settings.value.average_period_length,
    push_enabled: settings.value.push_enabled,
    cycle_alert_enabled: settings.value.cycle_alert_enabled,
  })
}

async function handleUpdate() {
  await updateSettings({
    average_cycle_length: settings.value.average_cycle_length,
    average_period_length: settings.value.average_period_length,
    push_enabled: settings.value.push_enabled,
    cycle_alert_enabled: settings.value.cycle_alert_enabled,
  })
}

const handleExport = () => exportData()

const handleImport = (e) => {
  const file = e.target.files[0]
  if (file) importData(file)
  e.target.value = ''
}

function triggerFileInput() {
  fileInput.value?.click()
}
</script>

<template>
  <main class="p-4 pb-24 min-h-screen bg-sand-light">
    <h1 class="text-xl font-bold text-ocean-deep mb-6">Configurações</h1>

    <!-- Seção: Ciclo -->
    <section class="bg-white/50 rounded-2xl p-5 shadow-sm mb-4">
      <h2 class="text-lg font-semibold text-ocean-deep mb-4">Ciclo</h2>

      <label class="block mb-4">
        <span class="text-ocean-deep/70 text-sm mb-1 block">Duração média do ciclo (dias)</span>
        <input
          type="number"
          v-model.number="settings.average_cycle_length"
          min="21"
          max="45"
          @change="handleUpdate"
          class="w-full p-4 rounded-xl bg-white border border-ocean-deep/10 text-lg text-ocean-deep focus:outline-none focus:ring-2 focus:ring-aqua-calm/40 transition-shadow"
          placeholder="28"
        />
      </label>

      <label class="block">
        <span class="text-ocean-deep/70 text-sm mb-1 block">Duração da menstruação (dias)</span>
        <input
          type="number"
          v-model.number="settings.average_period_length"
          min="2"
          max="10"
          @change="handleUpdate"
          class="w-full p-4 rounded-xl bg-white border border-ocean-deep/10 text-lg text-ocean-deep focus:outline-none focus:ring-2 focus:ring-aqua-calm/40 transition-shadow"
          placeholder="5"
        />
      </label>
    </section>

    <!-- Seção: Notificações -->
    <section class="bg-white/50 rounded-2xl p-5 shadow-sm mb-4">
      <h2 class="text-lg font-semibold text-ocean-deep mb-4">Notificações</h2>

      <div class="flex items-center justify-between py-3">
        <span class="text-ocean-deep">Lembrete diário</span>
        <button
          @click="toggleDailyReminder()"
          :class="settings.push_enabled ? 'bg-aqua-calm' : 'bg-ocean-deep/20'"
          class="relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-aqua-calm/40"
          :disabled="!isSupported"
        >
          <span
            :class="settings.push_enabled ? 'translate-x-6' : 'translate-x-1'"
            class="absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"
          />
        </button>
      </div>
      <p v-if="!isSupported" class="text-ocean-deep/40 text-xs mt-1">
        Push notifications não suportadas neste navegador
      </p>

      <div class="flex items-center justify-between py-3">
        <span class="text-ocean-deep">Alerta de ciclo</span>
        <button
          @click="toggleCycleAlert()"
          :class="settings.cycle_alert_enabled ? 'bg-aqua-calm' : 'bg-ocean-deep/20'"
          class="relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-aqua-calm/40"
          :disabled="!isSupported"
        >
          <span
            :class="settings.cycle_alert_enabled ? 'translate-x-6' : 'translate-x-1'"
            class="absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"
          />
        </button>
      </div>
    </section>

    <!-- Seção: Dados -->
    <section class="bg-white/50 rounded-2xl p-5 shadow-sm mb-4">
      <h2 class="text-lg font-semibold text-ocean-deep mb-4">Dados</h2>

      <button
        @click="handleExport"
        class="w-full py-4 rounded-xl text-center font-medium transition-colors bg-aqua-calm text-white hover:bg-aqua-calm/90 mb-3"
      >
        Exportar Dados
      </button>

      <input
        ref="fileInput"
        type="file"
        accept=".json"
        class="hidden"
        @change="handleImport"
      />

      <button
        @click="triggerFileInput"
        class="w-full py-4 rounded-xl text-center font-medium transition-colors bg-ocean-deep text-white hover:bg-ocean-deep/90"
      >
        Importar Dados
      </button>
    </section>
  </main>
</template>
