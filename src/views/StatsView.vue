<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { useDatabase } from '../composables/useDatabase'
import { useCycleLogic } from '../composables/useCycleLogic'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const { getCycles } = useDatabase()
const { getCycleDays } = useCycleLogic()

const selectedCount = ref(3)
const allCycles = ref([])
const lineChartData = ref(null)
const lineChartOptions = ref(null)
const loading = ref(true)

const MOOD_LABELS = {
  5: '😊 Feliz',
  4: '💪 Disposta',
  3: '😴 Cansada',
  2: '😢 Triste',
  1: '😤 Irritada',
}

// Ciclos completos mais recentes (do mais novo para o mais velho)
const completedCycles = computed(() => {
  return allCycles.value
    .filter(c => c.end_date)
    .slice(0, selectedCount.value)
})

// Ciclos em ordem cronológica para o gráfico de barras
const cyclesForBarChart = computed(() => {
  return [...completedCycles.value].reverse()
})

const hasData = computed(() => completedCycles.value.length > 0)

const barChartData = computed(() => {
  if (!hasData.value) return null

  return {
    labels: cyclesForBarChart.value.map((_, i) => `Ciclo ${i + 1}`),
    datasets: [{
      label: 'Duração (dias)',
      data: cyclesForBarChart.value.map(c => {
        const start = new Date(c.start_date)
        const end = new Date(c.end_date)
        return Math.round((end - start) / (1000 * 60 * 60 * 24))
      }),
      backgroundColor: '#7FA9A4',
      borderRadius: 6,
    }],
  }
})

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: {
      display: true,
      text: 'Duração dos Ciclos',
      color: '#1E2D38',
      font: { size: 16, weight: 'semibold' },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
        color: '#1E2D38',
      },
      grid: { color: 'rgba(30, 45, 56, 0.08)' },
    },
    x: {
      ticks: { color: '#1E2D38' },
      grid: { display: false },
    },
  },
}

function buildLineChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Onda de Humor',
        color: '#1E2D38',
        font: { size: 16, weight: 'semibold' },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y
            return MOOD_LABELS[val] || `Humor: ${val}`
          },
        },
      },
    },
    scales: {
      y: {
        min: 0.5,
        max: 5.5,
        ticks: {
          stepSize: 1,
          callback: (val) => {
            const label = MOOD_LABELS[val]
            return label ? label.split(' ')[0] : ''
          },
          color: '#1E2D38',
        },
        grid: { color: 'rgba(30, 45, 56, 0.08)' },
      },
      x: {
        ticks: {
          color: '#1E2D38',
          maxTicksLimit: 15,
        },
        grid: { display: false },
      },
    },
  }
}

async function loadLineChart() {
  if (!hasData.value) {
    lineChartData.value = null
    lineChartOptions.value = null
    return
  }

  const latestCycle = completedCycles.value[0]
  const days = await getCycleDays(latestCycle.id)

  const moodData = days.map(d => (d.mood != null ? d.mood : null))
  const labels = days.map(d => `Dia ${d.dayNumber}`)

  lineChartData.value = {
    labels,
    datasets: [{
      label: 'Humor',
      data: moodData,
      borderColor: '#7FA9A4',
      backgroundColor: 'rgba(127, 169, 164, 0.2)',
      borderWidth: 2,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#7FA9A4',
      fill: true,
    }],
  }

  lineChartOptions.value = buildLineChartOptions()
}

async function loadAll() {
  loading.value = true
  allCycles.value = await getCycles()
  await loadLineChart()
  loading.value = false
}

function selectCount(count) {
  selectedCount.value = count
}

watch(selectedCount, async () => {
  await loadLineChart()
})

onMounted(loadAll)
</script>

<template>
  <main class="min-h-screen bg-sand-light p-4 pb-24">
    <h1 class="text-xl font-bold text-ocean-deep mb-6">Estatísticas</h1>

    <!-- Filtro de período -->
    <div class="flex gap-2 mb-6">
      <button
        @click="selectCount(3)"
        :class="selectedCount === 3
          ? 'bg-aqua-calm text-white shadow-sm'
          : 'bg-white/50 text-ocean-deep/60 hover:bg-white'"
        class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
      >
        Últimos 3 ciclos
      </button>
      <button
        @click="selectCount(6)"
        :class="selectedCount === 6
          ? 'bg-aqua-calm text-white shadow-sm'
          : 'bg-white/50 text-ocean-deep/60 hover:bg-white'"
        class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
      >
        Últimos 6 ciclos
      </button>
    </div>

    <!-- Estado vazio -->
    <div
      v-if="!loading && !hasData"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <div class="w-16 h-16 rounded-full bg-coral-mist flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#E08585" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8">
          <path d="M21 12a9 9 0 1 1-9-9" />
          <path d="M21 3v6h-6" />
          <path d="M21 3l-7 7" />
        </svg>
      </div>
      <p class="text-ocean-deep/50 text-base font-medium">
        Registre alguns ciclos para ver suas estatísticas
      </p>
    </div>

    <!-- Gráficos -->
    <div v-if="hasData" class="space-y-6">
      <!-- Gráfico de Regularidade (Bar) -->
      <div class="bg-white/50 rounded-2xl p-4 shadow-sm">
        <Bar
          v-if="barChartData"
          :data="barChartData"
          :options="barChartOptions"
          class="max-h-64"
        />
      </div>

      <!-- Gráfico Onda de Humor (Line) -->
      <div class="bg-white/50 rounded-2xl p-4 shadow-sm">
        <Line
          v-if="lineChartData"
          :data="lineChartData"
          :options="lineChartOptions"
          class="max-h-64"
        />
      </div>
    </div>
  </main>
</template>
