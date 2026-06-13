import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do Dexie
const mockDb = {
  cycles: {
    orderBy: vi.fn(),
    get: vi.fn(),
  },
  user_settings: {
    get: vi.fn(),
  },
  daily_logs: {
    where: vi.fn(),
  },
}

vi.mock('../../db/database', () => ({
  db: mockDb,
}))

describe('useCycleLogic — Lógica de previsão', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('predictNextCycle usa average_cycle_length quando há menos de 3 ciclos completos', async () => {
    // Configura menos de 3 ciclos completos.
    // A mock retorna o resultado de reverse().toArray(), então o mais recente vem primeiro.
    mockDb.cycles.orderBy.mockReturnValue({
      reverse: () => ({
        toArray: () => Promise.resolve([
          { id: 2, start_date: '2025-02-01', end_date: null },
          { id: 1, start_date: '2025-01-01', end_date: '2025-01-05' },
        ]),
      }),
    })

    mockDb.user_settings.get.mockResolvedValue({
      average_cycle_length: 28,
    })

    const { useCycleLogic } = await import('../useCycleLogic')
    const { predictNextCycle } = useCycleLogic()

    const result = await predictNextCycle()
    // lastCycle = allCycles[0] = ciclo 2 (mais recente) com start_date '2025-02-01'
    // completedCycles = apenas ciclo 1 (tem end_date) = 1 ciclo (< 3)
    // Usa average_cycle_length = 28
    // predicted = '2025-02-01' + 28 = '2025-03-01'
    expect(result).toBe('2025-03-01')
  })

  it('predictNextCycle calcula média com 3+ ciclos completos', async () => {
    // Configura 3 ciclos completos de durações diferentes
    mockDb.cycles.orderBy.mockReturnValue({
      reverse: () => ({
        toArray: () => Promise.resolve([
          { id: 3, start_date: '2025-03-01', end_date: '2025-03-28' }, // 27 dias
          { id: 2, start_date: '2025-02-01', end_date: '2025-02-27' }, // 26 dias
          { id: 1, start_date: '2025-01-01', end_date: '2025-01-30' }, // 29 dias
        ]),
      }),
    })

    // Não vamos usar user_settings porque temos 3 ciclos completos
    mockDb.user_settings.get.mockResolvedValue({
      average_cycle_length: 28,
    })

    const { useCycleLogic } = await import('../useCycleLogic')
    const { predictNextCycle } = useCycleLogic()

    const result = await predictNextCycle()
    // Média: (27 + 26 + 29) / 3 = 27.33, arredondado = 27
    // Último ciclo começa 2025-03-01 + 27 = 2025-03-28
    expect(result).toBe('2025-03-28')
  })

  it('predictNextCycle retorna null se não houver ciclos', async () => {
    mockDb.cycles.orderBy.mockReturnValue({
      reverse: () => ({
        toArray: () => Promise.resolve([]),
      }),
    })

    const { useCycleLogic } = await import('../useCycleLogic')
    const { predictNextCycle } = useCycleLogic()

    const result = await predictNextCycle()
    expect(result).toBeNull()
  })

  it('getCurrentCycleInfo retorna informações do ciclo ativo', async () => {
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 14) // dia 15 do ciclo
    const startStr = startDate.toISOString().split('T')[0]

    const predictedEnd = new Date(startDate)
    predictedEnd.setDate(predictedEnd.getDate() + 28)
    const predictedStr = predictedEnd.toISOString().split('T')[0]

    mockDb.cycles.orderBy.mockReturnValue({
      reverse: () => ({
        toArray: () => Promise.resolve([
          { id: 1, start_date: startStr, end_date: null, predicted_next_start: predictedStr },
        ]),
      }),
    })

    mockDb.user_settings.get.mockResolvedValue({
      average_period_length: 5,
    })

    const { useCycleLogic } = await import('../useCycleLogic')
    const { getCurrentCycleInfo } = useCycleLogic()

    const result = await getCurrentCycleInfo()
    expect(result).not.toBeNull()
    expect(result.cycleId).toBe(1)
    expect(result.dayOfCycle).toBe(15) // 14 dias atrás + 1
    expect(result.daysUntilNext).toBeGreaterThan(0)
  })

  it('getCurrentCycleInfo retorna null se não houver ciclos', async () => {
    mockDb.cycles.orderBy.mockReturnValue({
      reverse: () => ({
        toArray: () => Promise.resolve([]),
      }),
    })

    const { useCycleLogic } = await import('../useCycleLogic')
    const { getCurrentCycleInfo } = useCycleLogic()

    const result = await getCurrentCycleInfo()
    expect(result).toBeNull()
  })

  it('getCycleDays retorna array de dias com dados corretos', async () => {
    mockDb.cycles.get.mockResolvedValue({
      id: 1,
      start_date: '2025-01-01',
      end_date: '2025-01-05',
    })

    mockDb.daily_logs.where.mockReturnValue({
      equals: () => ({
        sortBy: () => Promise.resolve([
          { date: '2025-01-01', mood: 5, had_sex: false, is_period_day: true },
          { date: '2025-01-02', mood: null, had_sex: false, is_period_day: true },
          { date: '2025-01-05', mood: 3, had_sex: true, is_period_day: true },
        ]),
      }),
    })

    const { useCycleLogic } = await import('../useCycleLogic')
    const { getCycleDays } = useCycleLogic()

    const days = await getCycleDays(1)

    // Agora vai até hoje (end_date não limita mais o range)
    const today = new Date().toISOString().split('T')[0]
    expect(days.length).toBeGreaterThan(5)
    expect(days[days.length - 1].date).toBe(today)

    // Dia 1: is_period_day true, mood 5
    expect(days[0]).toMatchObject({
      date: '2025-01-01',
      dayNumber: 1,
      is_period_day: true,
      mood: 5,
    })

    // Dia 3 (sem registro): is_period_day false, mood null
    expect(days[2]).toMatchObject({
      date: '2025-01-03',
      dayNumber: 3,
      is_period_day: false,
      mood: null,
    })

    // Dia 5: is_period_day true, mood 3, had_sex true
    expect(days[4]).toMatchObject({
      date: '2025-01-05',
      dayNumber: 5,
      is_period_day: true,
      mood: 3,
      had_sex: true,
    })
  })

  it('getCycleDays retorna array vazio se ciclo não existe', async () => {
    mockDb.cycles.get.mockResolvedValue(null)

    const { useCycleLogic } = await import('../useCycleLogic')
    const { getCycleDays } = useCycleLogic()

    const days = await getCycleDays(999)
    expect(days).toEqual([])
  })

  it('getUpcomingPrediction retorna predicted_next_start do último ciclo', async () => {
    mockDb.cycles.orderBy.mockReturnValue({
      reverse: () => ({
        first: () => Promise.resolve({
          id: 1,
          start_date: '2025-01-01',
          predicted_next_start: '2025-01-29',
        }),
      }),
    })

    const { useCycleLogic } = await import('../useCycleLogic')
    const { getUpcomingPrediction } = useCycleLogic()

    const result = await getUpcomingPrediction()
    expect(result).toBe('2025-01-29')
  })

  it('getUpcomingPrediction retorna null se não houver ciclos', async () => {
    mockDb.cycles.orderBy.mockReturnValue({
      reverse: () => ({
        first: () => Promise.resolve(null),
      }),
    })

    const { useCycleLogic } = await import('../useCycleLogic')
    const { getUpcomingPrediction } = useCycleLogic()

    const result = await getUpcomingPrediction()
    expect(result).toBeNull()
  })
})
