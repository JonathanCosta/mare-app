<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  year: Number,
  month: Number,
  registeredDays: {
    type: Array,
    default: () => [],
  },
  predictedDays: {
    type: Array,
    default: () => [],
  },
  today: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select-day', 'prev-month', 'next-month'])

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const moodEmojis = {
  5: '😊',
  4: '💪',
  3: '😴',
  2: '😢',
  1: '😤',
}

const daysInMonth = computed(() => new Date(props.year, props.month + 1, 0).getDate())
const firstDayOfWeek = computed(() => new Date(props.year, props.month, 1).getDay())
const daysInPrevMonth = computed(() => new Date(props.year, props.month, 0).getDate())

const grid = computed(() => {
  const cells = []
  const totalCells = 42

  for (let i = 0; i < totalCells; i++) {
    let dayNumber, date, isCurrentMonth

    if (i < firstDayOfWeek.value) {
      const prevMonth = props.month === 0 ? 11 : props.month - 1
      const prevYear = props.month === 0 ? props.year - 1 : props.year
      dayNumber = daysInPrevMonth.value - firstDayOfWeek.value + i + 1
      date = formatDate(prevYear, prevMonth + 1, dayNumber)
      isCurrentMonth = false
    } else if (i >= firstDayOfWeek.value + daysInMonth.value) {
      const nextMonth = props.month === 11 ? 0 : props.month + 1
      const nextYear = props.month === 11 ? props.year + 1 : props.year
      dayNumber = i - firstDayOfWeek.value - daysInMonth.value + 1
      date = formatDate(nextYear, nextMonth + 1, dayNumber)
      isCurrentMonth = false
    } else {
      dayNumber = i - firstDayOfWeek.value + 1
      date = formatDate(props.year, props.month + 1, dayNumber)
      isCurrentMonth = true
    }

    const registered = props.registeredDays.find(d => d.date === date)
    const isPredicted = props.predictedDays.includes(date)
    const isToday = date === props.today

    cells.push({
      dayNumber,
      date,
      isCurrentMonth,
      isToday,
      isRegistered: !!registered,
      isPredicted,
      mood: registered ? registered.mood : null,
    })
  }

  return cells
})

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Swipe handling
const calendarRef = ref(null)
let touchStartX = 0
let touchStartY = 0
let swiped = false

function onTouchStart(e) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  swiped = false
}

function onTouchEnd(e) {
  const diffX = e.changedTouches[0].clientX - touchStartX
  const diffY = e.changedTouches[0].clientY - touchStartY

  // Only trigger swipe if horizontal movement > 50px and more horizontal than vertical
  if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
    swiped = true
    if (diffX > 0) {
      emit('prev-month')
    } else {
      emit('next-month')
    }
  }
}

function onDayClick(cell) {
  if (swiped) return
  emit('select-day', cell.date)
}

function navigate(direction) {
  if (direction === 'prev') {
    emit('prev-month')
  } else {
    emit('next-month')
  }
}
</script>

<template>
  <div class="select-none">
    <!-- Header do mês -->
    <div class="flex items-center justify-between mb-4">
      <button
        @click="navigate('prev')"
        class="w-10 h-10 flex items-center justify-center rounded-xl text-ocean-deep/60 hover:text-ocean-deep hover:bg-ocean-deep/5 transition-colors"
        aria-label="Mês anterior"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <h2 class="text-lg font-semibold text-ocean-deep">
        {{ monthNames[month] }} {{ year }}
      </h2>
      <button
        @click="navigate('next')"
        class="w-10 h-10 flex items-center justify-center rounded-xl text-ocean-deep/60 hover:text-ocean-deep hover:bg-ocean-deep/5 transition-colors"
        aria-label="Próximo mês"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>

    <!-- Grid do calendário -->
    <div
      ref="calendarRef"
      class="grid grid-cols-7 gap-1"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
    >
      <!-- Nomes dos dias da semana -->
      <div
        v-for="day in dayNames"
        :key="day"
        class="text-center text-xs font-medium text-ocean-deep/50 py-2"
      >
        {{ day }}
      </div>

      <!-- Células do calendário -->
      <div
        v-for="cell in grid"
        :key="cell.date"
        @click="onDayClick(cell)"
        class="flex flex-col items-center justify-center rounded-xl py-1 h-14 cursor-pointer transition-colors duration-200 relative"
        :class="[
          cell.isCurrentMonth ? '' : 'opacity-30',
          cell.isToday ? 'bg-aqua-calm/20 ring-1 ring-aqua-calm' : '',
          cell.isRegistered && cell.isCurrentMonth ? 'bg-coral-flow text-white' : '',
          cell.isPredicted && !cell.isRegistered && cell.isCurrentMonth ? 'bg-coral-mist' : '',
          !cell.isRegistered && !cell.isPredicted && cell.isCurrentMonth && !cell.isToday ? 'hover:bg-ocean-deep/5' : '',
        ]"
      >
        <span class="text-sm font-medium leading-tight">{{ cell.dayNumber }}</span>
        <span v-if="cell.mood" class="text-xs leading-tight mt-0.5">{{ moodEmojis[cell.mood] || '' }}</span>
      </div>
    </div>
  </div>
</template>
