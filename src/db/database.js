import Dexie from 'dexie'

const db = new Dexie('CycleAppDB')

db.version(1).stores({
  user_settings: 'id',
  cycles: '++id, start_date, end_date',
  daily_logs: 'date, cycle_id, mood',
})

db.version(2).stores({
  user_settings: 'id',
  cycles: '++id, start_date, end_date',
  daily_logs: 'date, cycle_id, mood, is_period_day',
})

db.on('populate', () => {
  db.user_settings.add({
    id: 'config',
    average_cycle_length: 28,
    average_period_length: 5,
    push_enabled: false,
    onboarding_complete: false,
  })
})

export { db }
