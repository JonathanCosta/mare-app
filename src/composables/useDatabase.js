import { db } from '../db/database'

export function useDatabase() {
  async function getSettings() {
    return await db.user_settings.get('config')
  }

  async function updateSettings(settings) {
    await db.user_settings.put({ id: 'config', ...settings })
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

  async function saveLog(entry) {
    await db.daily_logs.put(entry)
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
    getLog,
    saveLog,
    getLogsByCycle
  }
}
