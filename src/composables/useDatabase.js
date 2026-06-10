import { db } from '../db/database'

export function useDatabase() {
  async function getSettings() {
    return await db.user_settings.get('config')
  }

  async function updateSettings(settings) {
    const existing = await getSettings() || {}
    await db.user_settings.put({ id: 'config', ...existing, ...settings })
  }

  async function getCycles() {
    return await db.cycles.orderBy('start_date').reverse().toArray()
  }

  async function addCycle(startDate) {
    const settings = await getSettings()
    const start = new Date(startDate)
    const predictedNext = new Date(start)
    predictedNext.setDate(predictedNext.getDate() + settings.average_cycle_length)

    const id = await db.cycles.add({
      start_date: startDate,
      predicted_next_start: predictedNext.toISOString().split('T')[0]
    })
    return id
  }

  async function closeCycle(id, endDate) {
    await db.cycles.update(id, { end_date: endDate })
  }

  async function getLog(date) {
    return await db.daily_logs.get(date)
  }

  async function findActiveCycle() {
    const cycles = await db.cycles.orderBy('start_date').reverse().toArray()
    return cycles.find(c => !c.end_date) || null
  }

  async function autoCloseCycle(cycleId) {
    const cycle = await db.cycles.get(cycleId)
    if (!cycle || cycle.end_date) return

    const logs = await db.daily_logs
      .where('cycle_id')
      .equals(cycleId)
      .toArray()

    const periodDays = logs
      .filter(l => l.is_period_day)
      .sort((a, b) => b.date.localeCompare(a.date))

    if (periodDays.length === 0) return

    const lastDate = new Date(periodDays[0].date + 'T12:00:00')
    const today = new Date()
    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24))

    if (diffDays >= 10) {
      await db.cycles.update(cycleId, { end_date: periodDays[0].date })
    }
  }

  async function saveLog(entry) {
    if (entry.is_period_day) {
      const active = await findActiveCycle()
      if (!active) {
        const newId = await addCycle(entry.date)
        entry.cycle_id = newId
      } else {
        entry.cycle_id = active.id
      }
    } else if (!entry.cycle_id) {
      const active = await findActiveCycle()
      if (active) {
        entry.cycle_id = active.id
      } else {
        const cycles = await db.cycles.orderBy('start_date').reverse().toArray()
        if (cycles.length > 0) {
          entry.cycle_id = cycles[0].id
        }
      }
    }

    await db.daily_logs.put(entry)

    if (entry.cycle_id) {
      await autoCloseCycle(entry.cycle_id)
    }
  }

  async function getLogsByCycle(cycleId) {
    return await db.daily_logs
      .where('cycle_id')
      .equals(cycleId)
      .sortBy('date')
  }

  return {
    getSettings,
    updateSettings,
    getCycles,
    addCycle,
    closeCycle,
    findActiveCycle,
    autoCloseCycle,
    getLog,
    saveLog,
    getLogsByCycle
  }
}
