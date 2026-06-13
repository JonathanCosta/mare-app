import { db } from '../db/database'

export function useCycleLogic() {
  /**
   * Retorna a data prevista para o próximo ciclo.
   * Se houver 3+ ciclos completos, calcula a média de duração (end_date - start_date).
   * Caso contrário, usa average_cycle_length das configurações.
   */
  async function predictNextCycle() {
    const allCycles = await db.cycles.orderBy('start_date').reverse().toArray()
    const completedCycles = allCycles.filter(c => c.end_date).slice(0, 3)

    let avgDuration

    if (completedCycles.length >= 3) {
      const totalDays = completedCycles.reduce((sum, c) => {
        const diff = Math.abs(new Date(c.end_date) - new Date(c.start_date))
        return sum + diff / (1000 * 60 * 60 * 24)
      }, 0)
      avgDuration = Math.round(totalDays / completedCycles.length)
    } else {
      const settings = await db.user_settings.get('config')
      avgDuration = settings.average_cycle_length
    }

    const lastCycle = allCycles[0]
    if (!lastCycle) return null

    const predictedStart = new Date(lastCycle.start_date)
    predictedStart.setDate(predictedStart.getDate() + avgDuration)
    return predictedStart.toISOString().split('T')[0]
  }

  /**
   * Retorna informações sobre o ciclo atual.
   * Encontra o ciclo ativo (sem end_date) ou o mais recente.
   */
  async function getCurrentCycleInfo() {
    const allCycles = await db.cycles.orderBy('start_date').reverse().toArray()
    const activeCycle = allCycles.find(c => !c.end_date)
    const cycle = activeCycle || allCycles[0]
    if (!cycle) return null

    const today = new Date()
    const start = new Date(cycle.start_date)
    const dayOfCycle = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1

    const settings = await db.user_settings.get('config')
    const periodLength = settings.average_period_length

    let status = 'unknown'
    if (dayOfCycle <= periodLength) {
      status = 'menstruating'
    } else if (dayOfCycle <= 16) {
      status = 'fertile'
    } else {
      status = 'luteal'
    }

    let daysUntilNext = null
    if (cycle.predicted_next_start) {
      const nextStart = new Date(cycle.predicted_next_start)
      daysUntilNext = Math.ceil((nextStart - today) / (1000 * 60 * 60 * 24))
    }

    return {
      cycleId: cycle.id,
      dayOfCycle,
      daysUntilNext,
      status
    }
  }

  /**
   * Retorna array com todos os dias de um ciclo, incluindo humor e relação.
   */
  async function getCycleDays(cycleId) {
    const logs = await db.daily_logs
      .where('cycle_id')
      .equals(cycleId)
      .sortBy('date')

    const cycle = await db.cycles.get(cycleId)
    if (!cycle) return []

    const start = new Date(cycle.start_date)
    // Vai até hoje mesmo se o ciclo foi fechado (autoCloseCycle)
    // para não perder registros de humor/sintomas pós-menstruação
    const end = new Date()

    // Preenche todos os dias do ciclo, mesmo os sem registro
    const days = []
    const current = new Date(start)
    const logMap = new Map(logs.map(l => [l.date, l]))

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      const log = logMap.get(dateStr)
      const dayNumber = Math.floor((current - start) / (1000 * 60 * 60 * 24)) + 1

      days.push({
        date: dateStr,
        dayNumber,
        mood: log ? log.mood : null,
        had_sex: log ? log.had_sex : false,
        is_period_day: log ? !!log.is_period_day : false,
      })

      current.setDate(current.getDate() + 1)
    }

    return days
  }

  /**
   * Retorna a predicted_next_start do último ciclo.
   */
  async function getUpcomingPrediction() {
    const lastCycle = await db.cycles.orderBy('start_date').reverse().first()
    if (!lastCycle) return null
    return lastCycle.predicted_next_start || null
  }

  return {
    predictNextCycle,
    getCurrentCycleInfo,
    getCycleDays,
    getUpcomingPrediction
  }
}
