<script setup>
import { ref, onMounted } from 'vue'
import { useDatabase } from '../composables/useDatabase'
import { useBackup } from '../composables/useBackup'

const { getSettings, updateSettings } = useDatabase()
const { exportData, importData } = useBackup()

const settings = ref({
  average_cycle_length: 28,
  average_period_length: 5,
  push_enabled: false,
})

const fileInput = ref(null)

onMounted(async () => {
  const saved = await getSettings()
  if (saved) settings.value = { ...settings.value, ...saved }
})

async function handleUpdate() {
  await updateSettings({
    average_cycle_length: settings.value.average_cycle_length,
    average_period_length: settings.value.average_period_length,
    push_enabled: settings.value.push_enabled,
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
          @click="settings.push_enabled = !settings.push_enabled; handleUpdate()"
          :class="settings.push_enabled ? 'bg-aqua-calm' : 'bg-ocean-deep/20'"
          class="relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-aqua-calm/40"
        >
          <span
            :class="settings.push_enabled ? 'translate-x-6' : 'translate-x-1'"
            class="absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"
          />
        </button>
      </div>

      <div class="flex items-center justify-between py-3">
        <span class="text-ocean-deep">Alerta de ciclo</span>
        <button
          @click=""
          class="relative w-12 h-7 rounded-full transition-colors duration-200 bg-ocean-deep/20 focus:outline-none focus:ring-2 focus:ring-aqua-calm/40 opacity-50"
          disabled
        >
          <span
            class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm"
          />
        </button>
      </div>
      <p class="text-ocean-deep/40 text-xs mt-2">Disponível em breve</p>
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
