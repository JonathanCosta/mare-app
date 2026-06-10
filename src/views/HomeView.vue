<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDatabase } from '../composables/useDatabase'
import { useCycleLogic } from '../composables/useCycleLogic'
import CalendarGrid from '../components/CalendarGrid.vue'
import BottomSheet from '../components/BottomSheet.vue'

const router = useRouter()
const { getSettings, getCycles } = useDatabase()
const { getCurrentCycleInfo, getCycleDays } = useCycleLogic()

const loading = ref(true)
const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth())
const today = ref(new Date().toISOString().split('T')[0])

const currentCycle = ref(null)
const cycleDaysData = ref([])
const settingsData = ref(null)
const latestCycleData = ref(null)

const selectedDate = ref(null)
const sheetOpen = ref(false)

const hasCycle = computed(() => !!currentCycle.value)

const monthNames = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const moodNames = {
  5: 'Feliz',
  4: 'Disposta',
  3: 'Cansada',
  2: 'Triste',
  1: 'Irritada',
}

const moodEmojis = {
  5: '😊',
  4: '💪',
  3: '😴',
  2: '😢',
  1: '😤',
}

const headerMessage = computed(() => {
  if (loading.value) return ''
  if (!hasCycle.value) return 'Bem-vinda à Maré'

  const info = currentCycle.value
  if (!info) return 'A vida em ciclos'

  if (info.daysUntilNext !== null && info.daysUntilNext <= 5 && info.daysUntilNext > 0) {
    return `Menstruação em ${info.daysUntilNext} ${info.daysUntilNext === 1 ? 'dia' : 'dias'}`
  }
  if (info.daysUntilNext !== null && info.daysUntilNext <= 0) {
    return 'Menstruação prevista para hoje'
  }
  return `Dia ${info.dayOfCycle} do ciclo`
})

const registeredDays = computed(() => {
  return cycleDaysData.value
    .filter(d => d.mood !== null)
    .map(d => ({ date: d.date, mood: d.mood }))
})

const predictedDays = computed(() => {
  if (!settingsData.value || !latestCycleData.value?.predicted_next_start) return []

  const start = new Date(latestCycleData.value.predicted_next_start + 'T12:00:00')
  const days = []

  for (let i = 0; i < settingsData.value.average_period_length; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }

  return days
})

const selectedDayData = computed(() => {
  if (!selectedDate.value) return null
  return cycleDaysData.value.find(d => d.date === selectedDate.value) || null
})

const selectedDayMood = computed(() => {
  const data = selectedDayData.value
  if (!data || !data.mood) return null
  return {
    value: data.mood,
    name: moodNames[data.mood] || '',
    emoji: moodEmojis[data.mood] || '',
  }
})

const selectedDayMenstruation = computed(() => {
  if (!selectedDate.value || !latestCycleData.value || !settingsData.value) return false
  const cycleStart = new Date(latestCycleData.value.start_date + 'T12:00:00')
  const selected = new Date(selectedDate.value + 'T12:00:00')
  const diffDays = Math.floor((selected - cycleStart) / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays < settingsData.value.average_period_length
})

const formattedSelectedDate = computed(() => {
  if (!selectedDate.value) return ''
  const d = new Date(selectedDate.value + 'T12:00:00')
  return `${d.getDate()} de ${monthNames[d.getMonth()]} de ${d.getFullYear()}`
})

onMounted(async () => {
  try {
    const settings = await getSettings()
    settingsData.value = settings

    const allCycles = await getCycles()
    latestCycleData.value = allCycles[0] || null

    const cycleInfo = await getCurrentCycleInfo()
    if (cycleInfo) {
      currentCycle.value = cycleInfo
      const days = await getCycleDays(cycleInfo.cycleId)
      cycleDaysData.value = days
    }
  } finally {
    loading.value = false
  }
})

function onPrevMonth() {
  if (month.value === 0) {
    month.value = 11
    year.value--
  } else {
    month.value--
  }
}

function onNextMonth() {
  if (month.value === 11) {
    month.value = 0
    year.value++
  } else {
    month.value++
  }
}

function onSelectDay(date) {
  selectedDate.value = date
  sheetOpen.value = true
}

function closeSheet() {
  sheetOpen.value = false
}

function goToLog() {
  const date = selectedDate.value || today.value
  router.push({ name: 'log', query: { date } })
}

function startFirstLog() {
  router.push({ name: 'log', query: { date: today.value } })
}
</script>

<template>
  <main class="p-4 pb-24 min-h-screen bg-sand-light">
    <!-- Header -->
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-ocean-deep">Maré</h1>
      <p class="text-ocean-deep/70 mt-1">
        {{ loading ? 'Carregando...' : headerMessage }}
      </p>
    </header>

    <!-- Loading State -->
    <section
      v-if="loading"
      class="bg-white/50 rounded-2xl p-8 shadow-sm"
    >
      <div class="flex flex-col items-center gap-4 py-8">
        <div class="w-8 h-8 border-2 border-aqua-calm border-t-transparent rounded-full animate-spin" />
        <p class="text-ocean-deep/50 text-sm">Preparando sua maré...</p>
      </div>
    </section>

    <!-- Empty State (no cycle) -->
    <section
      v-else-if="!hasCycle"
      class="bg-white/50 rounded-2xl p-8 shadow-sm text-center"
    >
      <div class="py-8 space-y-4">
        <div class="text-5xl mb-2">🌊</div>
        <h2 class="text-xl font-semibold text-ocean-deep">Bem-vinda à Maré</h2>
        <p class="text-ocean-deep/60 text-sm max-w-xs mx-auto">
          Acompanhe seu ciclo com privacidade total. Seus dados ficam apenas no seu dispositivo.
        </p>
        <button
          @click="startFirstLog"
          class="mt-4 px-8 py-3 bg-aqua-calm text-white rounded-2xl font-medium shadow-sm hover:bg-aqua-calm/90 transition-colors duration-200"
        >
          Começar
        </button>
      </div>
    </section>

    <!-- Calendar View -->
    <section
      v-else
      class="bg-white/50 rounded-2xl p-4 shadow-sm"
    >
      <CalendarGrid
        :year="year"
        :month="month"
        :registered-days="registeredDays"
        :predicted-days="predictedDays"
        :today="today"
        @select-day="onSelectDay"
        @prev-month="onPrevMonth"
        @next-month="onNextMonth"
      />
    </section>

    <!-- Bottom Sheet -->
    <BottomSheet :show="sheetOpen" @close="closeSheet">
      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-ocean-deep">
          {{ formattedSelectedDate }}
        </h2>

        <div class="space-y-2">
          <div
            v-if="selectedDayMenstruation"
            class="flex items-center gap-2 text-sm"
          >
            <span class="w-3 h-3 rounded-full bg-coral-flow" />
            <span class="text-ocean-deep/70">Dia de menstruação</span>
          </div>

          <div v-if="selectedDayMood" class="flex items-center gap-2 text-sm">
            <span>{{ selectedDayMood.emoji }}</span>
            <span class="text-ocean-deep/70">Humor: {{ selectedDayMood.name }}</span>
          </div>

          <p
            v-if="!selectedDayData"
            class="text-ocean-deep/50 text-sm"
          >
            Nenhum registro para este dia.
          </p>
        </div>

        <button
          @click="goToLog"
          class="w-full py-3 bg-aqua-calm text-white rounded-2xl font-medium shadow-sm hover:bg-aqua-calm/90 transition-colors duration-200"
        >
          {{ selectedDayData ? 'Editar Registro' : 'Adicionar Registro' }}
        </button>
      </div>
    </BottomSheet>
  </main>
</template>
