<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDatabase } from '../composables/useDatabase'

const route = useRoute()
const { getLog, saveLog, getCycles, addCycle } = useDatabase()

const monthNames = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)
const logEntry = ref({
  date: today,
  cycle_id: null,
  had_sex: false,
  took_medication: false,
  is_period_day: false,
  mood: null,
  notes: '',
})

const toastVisible = ref(false)
const toastTimeout = ref(null)
const dateInputRef = ref(null)

const formattedDate = computed(() => {
  const d = new Date(selectedDate.value + 'T12:00:00')
  return `${d.getDate()} de ${monthNames[d.getMonth()]} de ${d.getFullYear()}`
})

const moodOptions = [
  { value: 5, emoji: '😊', label: 'Feliz' },
  { value: 4, emoji: '💪', label: 'Disposta' },
  { value: 3, emoji: '😴', label: 'Cansada' },
  { value: 2, emoji: '😢', label: 'Triste' },
  { value: 1, emoji: '😤', label: 'Irritada' },
]

function showToast() {
  toastVisible.value = true
  if (toastTimeout.value) clearTimeout(toastTimeout.value)
  toastTimeout.value = setTimeout(() => {
    toastVisible.value = false
  }, 2000)
}

async function loadLog(date) {
  try {
    const existing = await getLog(date)
    if (existing) {
      logEntry.value = { ...existing }
    } else {
      const cycles = await getCycles()
      let cycleId = null
      if (cycles.length > 0) {
        cycleId = cycles[0].id
      } else {
        cycleId = await addCycle(date)
      }
      logEntry.value = {
        date,
        cycle_id: cycleId,
        had_sex: false,
        took_medication: false,
        is_period_day: false,
        mood: null,
        notes: '',
      }
    }
  } catch (err) {
    console.error('[LogView] Erro ao carregar registro:', err)
  }
}

async function handleSave() {
  try {
    await saveLog({ ...logEntry.value })
    showToast()
  } catch (err) {
    console.error('[LogView] Erro ao salvar:', err)
  }
}

function toggleField(field) {
  logEntry.value[field] = !logEntry.value[field]
  handleSave()
}

function selectMood(value) {
  logEntry.value.mood = value
  handleSave()
}

async function handleNotesBlur() {
  await handleSave()
}

function openDatePicker() {
  dateInputRef.value?.showPicker()
}

function onDateChange(e) {
  const newDate = e.target.value
  if (newDate) {
    selectedDate.value = newDate
  }
}

watch(selectedDate, (newDate) => {
  loadLog(newDate)
})

onMounted(() => {
  const dateParam = route.query.date
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    selectedDate.value = dateParam
  }
  loadLog(selectedDate.value)
})
</script>

<template>
  <main class="min-h-screen bg-sand-light p-4 pb-24">
    <!-- Header com seletor de data -->
    <header class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold text-ocean-deep">Diário</h1>
        <p class="text-ocean-deep/60 text-sm mt-1">{{ formattedDate }}</p>
      </div>
      <div class="relative">
        <input
          ref="dateInputRef"
          type="date"
          :value="selectedDate"
          :max="today"
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          @change="onDateChange"
        />
        <button
          @click="openDatePicker"
          class="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-2xl text-ocean-deep/70 text-sm font-medium shadow-sm hover:bg-white transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Alterar data
        </button>
      </div>
    </header>

    <!-- Chips de toggle -->
    <section class="mb-6">
      <h2 class="text-sm font-medium text-ocean-deep/50 uppercase tracking-wider mb-3">Sintomas</h2>
      <div class="flex gap-3">
        <button
          @click="toggleField('had_sex')"
          :class="logEntry.had_sex
            ? 'bg-aqua-calm text-white shadow-sm'
            : 'bg-ocean-deep/10 text-ocean-deep/60 hover:bg-ocean-deep/20'"
          class="px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
        >
          Relação Sexual
        </button>
        <button
          @click="toggleField('took_medication')"
          :class="logEntry.took_medication
            ? 'bg-aqua-calm text-white shadow-sm'
            : 'bg-ocean-deep/10 text-ocean-deep/60 hover:bg-ocean-deep/20'"
          class="px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
        >
          Medicação
        </button>
        <button
          @click="toggleField('is_period_day')"
          :class="logEntry.is_period_day
            ? 'bg-coral-flow text-white shadow-sm'
            : 'bg-ocean-deep/10 text-ocean-deep/60 hover:bg-ocean-deep/20'"
          class="px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
        >
          Estou menstruada
        </button>
      </div>
    </section>

    <!-- Grade de Humor -->
    <section class="mb-6">
      <h2 class="text-sm font-medium text-ocean-deep/50 uppercase tracking-wider mb-3">Humor</h2>
      <div class="grid grid-cols-5 gap-2">
        <button
          v-for="mood in moodOptions"
          :key="mood.value"
          @click="selectMood(mood.value)"
          :class="logEntry.mood === mood.value
            ? 'bg-aqua-calm/20 ring-2 ring-aqua-calm'
            : 'bg-white/50 hover:bg-white hover:shadow-sm'"
          class="flex flex-col items-center gap-1 py-3 rounded-2xl transition-all duration-200"
        >
          <span class="text-2xl">{{ mood.emoji }}</span>
          <span class="text-xs text-ocean-deep/60 font-medium">{{ mood.label }}</span>
        </button>
      </div>
    </section>

    <!-- Campo de notas -->
    <section class="mb-6">
      <h2 class="text-sm font-medium text-ocean-deep/50 uppercase tracking-wider mb-3">Notas</h2>
      <textarea
        v-model="logEntry.notes"
        @blur="handleNotesBlur"
        placeholder="Como foi o seu dia?"
        class="w-full h-32 bg-white/50 rounded-2xl border border-ocean-deep/10 p-4 text-ocean-deep placeholder-ocean-deep/40 resize-none focus:outline-none focus:ring-2 focus:ring-aqua-calm/30 focus:bg-white transition-all duration-200"
      />
    </section>

    <!-- Toast "Salvo na sua maré" -->
    <Transition name="toast">
      <div
        v-if="toastVisible"
        class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-ocean-deep text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium"
      >
        Salvo na sua maré
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.toast-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.toast-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 10px);
}
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
