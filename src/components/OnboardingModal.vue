<script setup>
import { ref, computed } from 'vue'
import { useDatabase } from '../composables/useDatabase'

const props = defineProps({
  show: Boolean,
})

const emit = defineEmits(['close', 'complete'])

const { updateSettings, addCycle, saveLog } = useDatabase()

const today = new Date().toISOString().split('T')[0]

const form = ref({
  average_cycle_length: 28,
  average_period_length: 5,
  start_date: '',
  end_date: '',
})

const saving = ref(false)

const endDateMin = computed(() => form.value.start_date || today)

const canSave = computed(() => {
  return (
    form.value.average_cycle_length >= 21 &&
    form.value.average_cycle_length <= 45 &&
    form.value.average_period_length >= 2 &&
    form.value.average_period_length <= 10 &&
    form.value.start_date &&
    form.value.end_date &&
    form.value.end_date >= form.value.start_date
  )
})

async function handleSave() {
  if (!canSave.value) return
  saving.value = true
  try {
    await updateSettings({
      average_cycle_length: form.value.average_cycle_length,
      average_period_length: form.value.average_period_length,
      push_enabled: false,
      onboarding_complete: true,
    })

    const cycleId = await addCycle(form.value.start_date)

    const start = new Date(form.value.start_date + 'T12:00:00')
    const end = new Date(form.value.end_date + 'T12:00:00')
    const current = new Date(start)

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      await saveLog({
        date: dateStr,
        cycle_id: cycleId,
        had_sex: false,
        took_medication: false,
        is_period_day: true,
        mood: null,
        notes: '',
      })
      current.setDate(current.getDate() + 1)
    }

    emit('complete')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-50 bg-black/20 flex items-end justify-center" @click.self="null">
        <div class="bg-sand-light rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
          <div class="flex justify-center pt-3 pb-1">
            <div class="w-10 h-1 bg-ocean-deep/20 rounded-full" />
          </div>
          <div class="px-6 pb-8">
            <div class="text-center mb-6">
              <img src="/logo-icon-64.png" alt="" class="mx-auto w-16 h-16" />
              <h2 class="text-xl font-bold text-ocean-deep">Bem-vinda à Maré</h2>
              <p class="text-ocean-deep/60 text-sm mt-1">
                Vamos configurar seu ciclo para começar.
              </p>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-ocean-deep/70 mb-1">Duração média do ciclo (dias)</label>
                <input
                  v-model.number="form.average_cycle_length"
                  type="number"
                  min="21"
                  max="45"
                  class="w-full p-4 rounded-xl bg-white border border-ocean-deep/10 text-lg text-ocean-deep focus:outline-none focus:ring-2 focus:ring-aqua-calm/30"
                />
                <p class="text-xs text-ocean-deep/40 mt-1">Geralmente entre 21 e 45 dias</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-ocean-deep/70 mb-1">Duração da menstruação (dias)</label>
                <input
                  v-model.number="form.average_period_length"
                  type="number"
                  min="2"
                  max="10"
                  class="w-full p-4 rounded-xl bg-white border border-ocean-deep/10 text-lg text-ocean-deep focus:outline-none focus:ring-2 focus:ring-aqua-calm/30"
                />
                <p class="text-xs text-ocean-deep/40 mt-1">Geralmente entre 2 e 10 dias</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-ocean-deep/70 mb-1">Início da última menstruação</label>
                <input
                  v-model="form.start_date"
                  type="date"
                  :max="today"
                  class="w-full p-4 rounded-xl bg-white border border-ocean-deep/10 text-lg text-ocean-deep focus:outline-none focus:ring-2 focus:ring-aqua-calm/30"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-ocean-deep/70 mb-1">Fim da última menstruação</label>
                <input
                  v-model="form.end_date"
                  type="date"
                  :min="endDateMin"
                  :max="today"
                  class="w-full p-4 rounded-xl bg-white border border-ocean-deep/10 text-lg text-ocean-deep focus:outline-none focus:ring-2 focus:ring-aqua-calm/30"
                />
              </div>
            </div>

            <button
              @click="handleSave"
              :disabled="!canSave || saving"
              class="w-full mt-6 py-4 rounded-2xl font-medium text-white transition-all duration-200"
              :class="canSave && !saving ? 'bg-aqua-calm hover:bg-aqua-calm/90 shadow-sm' : 'bg-ocean-deep/20 cursor-not-allowed'"
            >
              {{ saving ? 'Salvando...' : 'Começar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
