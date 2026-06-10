import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Dexie
const mockStore = {}
const fakeDb = {
  user_settings: {
    get: vi.fn(),
    put: vi.fn(),
    add: vi.fn(),
  },
  cycles: {
    orderBy: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    get: vi.fn(),
  },
  daily_logs: {
    get: vi.fn(),
    put: vi.fn(),
    where: vi.fn(),
  },
}

vi.mock('../../db/database', () => ({
  db: fakeDb,
}))

describe('useDatabase — Operações CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSettings', () => {
    it('retorna as configurações do banco', async () => {
      fakeDb.user_settings.get.mockResolvedValue({
        id: 'config',
        average_cycle_length: 28,
        onboarding_complete: true,
      })

      const { useDatabase } = await import('../useDatabase')
      const { getSettings } = useDatabase()

      const result = await getSettings()
      expect(result.onboarding_complete).toBe(true)
      expect(result.average_cycle_length).toBe(28)
      expect(fakeDb.user_settings.get).toHaveBeenCalledWith('config')
    })
  })

  describe('updateSettings', () => {
    it('atualiza e faz merge com configurações existentes', async () => {
      fakeDb.user_settings.get.mockResolvedValue({
        id: 'config',
        average_cycle_length: 28,
        average_period_length: 5,
      })

      const { useDatabase } = await import('../useDatabase')
      const { updateSettings } = useDatabase()

      await updateSettings({ onboarding_complete: true })

      expect(fakeDb.user_settings.put).toHaveBeenCalledWith({
        id: 'config',
        average_cycle_length: 28,
        average_period_length: 5,
        onboarding_complete: true,
      })
    })

    it('cria configurações se não existirem', async () => {
      fakeDb.user_settings.get.mockResolvedValue(null)

      const { useDatabase } = await import('../useDatabase')
      const { updateSettings } = useDatabase()

      await updateSettings({ onboarding_complete: true })

      expect(fakeDb.user_settings.put).toHaveBeenCalledWith({
        id: 'config',
        onboarding_complete: true,
      })
    })
  })

  describe('addCycle', () => {
    it('adiciona ciclo com predicted_next_start calculado', async () => {
      fakeDb.user_settings.get.mockResolvedValue({
        id: 'config',
        average_cycle_length: 28,
      })
      fakeDb.cycles.add.mockResolvedValue(1)

      const { useDatabase } = await import('../useDatabase')
      const { addCycle } = useDatabase()

      const id = await addCycle('2025-01-15')

      expect(fakeDb.cycles.add).toHaveBeenCalledWith({
        start_date: '2025-01-15',
        predicted_next_start: '2025-02-12', // 15 + 28 dias
      })
      expect(id).toBe(1)
    })
  })

  describe('saveLog', () => {
    // Helper para mockar o chain .where().equals().toArray() usado em autoCloseCycle
    function mockWhereChain(result) {
      fakeDb.daily_logs.where.mockReturnValue({
        equals: () => ({
          toArray: () => Promise.resolve(result),
        }),
      })
    }

    it('salva um registro e associa ao ciclo ativo se is_period_day', async () => {
      mockWhereChain([
        { date: '2025-01-10', is_period_day: true },
      ])
      fakeDb.daily_logs.put.mockResolvedValue(undefined)
      fakeDb.cycles.orderBy.mockReturnValue({
        reverse: () => ({
          toArray: () => Promise.resolve([{ id: 1, start_date: '2025-01-01' }]),
        }),
      })
      fakeDb.cycles.get.mockResolvedValue({ id: 1, start_date: '2025-01-01', end_date: null })

      const { useDatabase } = await import('../useDatabase')
      const { saveLog } = useDatabase()

      const entry = {
        date: '2025-01-10',
        had_sex: false,
        took_medication: false,
        is_period_day: true,
        mood: 5,
        notes: 'test',
      }

      await saveLog(entry)

      expect(fakeDb.daily_logs.put).toHaveBeenCalled()
      const putCall = fakeDb.daily_logs.put.mock.calls[0][0]
      expect(putCall.is_period_day).toBe(true)
    })

    it('cria novo ciclo se is_period_day e não há ciclo ativo', async () => {
      mockWhereChain([])
      fakeDb.cycles.orderBy.mockReturnValue({
        reverse: () => ({
          toArray: () => Promise.resolve([]),
        }),
      })
      fakeDb.user_settings.get.mockResolvedValue({
        id: 'config',
        average_cycle_length: 28,
      })
      fakeDb.cycles.add.mockResolvedValue(2)
      fakeDb.daily_logs.put.mockResolvedValue(undefined)
      fakeDb.cycles.get.mockResolvedValue({ id: 2, start_date: '2025-02-01', end_date: null })

      const { useDatabase } = await import('../useDatabase')
      const { saveLog } = useDatabase()

      const entry = {
        date: '2025-02-01',
        had_sex: false,
        took_medication: false,
        is_period_day: true,
        mood: null,
        notes: '',
      }

      await saveLog(entry)

      // Deve ter criado um novo ciclo
      expect(fakeDb.cycles.add).toHaveBeenCalled()
    })
  })

  describe('autoCloseCycle', () => {
    it('fecha ciclo se último dia de menstruação foi há 10+ dias', async () => {
      fakeDb.cycles.get.mockResolvedValue({
        id: 1,
        end_date: null,
      })

      // Último período foi há 15 dias
      const lastPeriod = new Date()
      lastPeriod.setDate(lastPeriod.getDate() - 15)
      const lastPeriodStr = lastPeriod.toISOString().split('T')[0]

      fakeDb.daily_logs.where.mockReturnValue({
        equals: () => ({
          toArray: () => Promise.resolve([
            { date: lastPeriodStr, is_period_day: true },
          ]),
        }),
      })

      const { useDatabase } = await import('../useDatabase')
      const { autoCloseCycle } = useDatabase()

      await autoCloseCycle(1)

      // Deve ter fechado o ciclo
      expect(fakeDb.cycles.update).toHaveBeenCalledWith(1, { end_date: lastPeriodStr })
    })

    it('não fecha ciclo se último período foi há menos de 10 dias', async () => {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]

      fakeDb.cycles.get.mockResolvedValue({
        id: 1,
        end_date: null,
      })

      fakeDb.daily_logs.where.mockReturnValue({
        equals: () => ({
          toArray: () => Promise.resolve([
            { date: todayStr, is_period_day: true },
          ]),
        }),
      })

      const { useDatabase } = await import('../useDatabase')
      const { autoCloseCycle } = useDatabase()

      await autoCloseCycle(1)

      // Não deve fechar
      expect(fakeDb.cycles.update).not.toHaveBeenCalled()
    })
  })
})
