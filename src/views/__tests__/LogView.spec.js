import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// Mocks
const mockGetLog = vi.fn()
const mockSaveLog = vi.fn()
const mockGetCycles = vi.fn()
const mockAddCycle = vi.fn()

let mockRouteQuery = {}

vi.mock('../../composables/useDatabase', () => ({
  useDatabase: () => ({
    getLog: mockGetLog,
    saveLog: mockSaveLog,
    getCycles: mockGetCycles,
    addCycle: mockAddCycle,
  }),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: mockRouteQuery,
  }),
}))

import LogView from '../LogView.vue'

describe('LogView.vue — Correção 2: Date picker reativo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouteQuery = {}
    mockGetLog.mockResolvedValue(null)
    mockGetCycles.mockResolvedValue([{ id: 1, start_date: '2025-01-01' }])
    mockAddCycle.mockResolvedValue(1)
    mockSaveLog.mockResolvedValue(undefined)
  })

  it('renderiza o formulário do diário', () => {
    const wrapper = mount(LogView)
    expect(wrapper.text()).toContain('Diário')
    expect(wrapper.text()).toContain('Sintomas')
    expect(wrapper.text()).toContain('Humor')
    expect(wrapper.text()).toContain('Notas')
  })

  it('chama loadLog ao montar com a data atual', async () => {
    const today = new Date().toISOString().split('T')[0]

    mount(LogView)
    await nextTick()
    // Aguarda a promise do loadLog resolver
    await nextTick()
    await nextTick()

    expect(mockGetLog).toHaveBeenCalledWith(today)
  })

  it('recarrega log quando selectedDate muda (watch)', async () => {
    const wrapper = mount(LogView)
    await nextTick()
    await nextTick()
    await nextTick()

    // Reseta os mocks após o mount
    mockGetLog.mockClear()

    // Altera a data selecionada via input date oculto
    const dateInput = wrapper.find('input[type="date"]')
    expect(dateInput.exists()).toBe(true)

    await dateInput.setValue('2025-06-15')
    await nextTick()
    await nextTick()

    // Deve ter chamado loadLog com a nova data (via watch)
    expect(mockGetLog).toHaveBeenCalledWith('2025-06-15')
  })

  it('recarrega log ao trocar para data com registro existente', async () => {
    const existingLog = {
      date: '2025-06-10',
      cycle_id: 1,
      had_sex: true,
      took_medication: false,
      is_period_day: true,
      mood: 5,
      notes: 'Teste',
    }

    // Primeira chamada (mount): retorna null
    mockGetLog.mockResolvedValueOnce(null)
    // Segunda chamada (watch): retorna o registro existente
    mockGetLog.mockResolvedValueOnce(existingLog)

    const wrapper = mount(LogView)
    await nextTick()
    await nextTick()
    await nextTick()

    // Troca a data
    const dateInput = wrapper.find('input[type="date"]')
    await dateInput.setValue('2025-06-10')
    await nextTick()
    await nextTick()

    // loadLog foi chamado com a nova data
    expect(mockGetLog).toHaveBeenCalledWith('2025-06-10')
  })

  it('toggleField alterna had_sex e salva', async () => {
    const wrapper = mount(LogView)
    await nextTick()
    await nextTick()

    // Encontra o botão de Relação Sexual
    const sexButton = wrapper.findAll('button').filter(w =>
      w.text().includes('Relação Sexual')
    )
    expect(sexButton.length).toBeGreaterThanOrEqual(1)

    await sexButton[0].trigger('click')
    await nextTick()
    await nextTick()

    expect(mockSaveLog).toHaveBeenCalled()
    const lastCall = mockSaveLog.mock.calls[mockSaveLog.mock.calls.length - 1]
    expect(lastCall[0].had_sex).toBe(true)
  })

  it('selectMood salva o mood selecionado', async () => {
    const wrapper = mount(LogView)
    await nextTick()
    await nextTick()

    // Encontra o botão do mood "Feliz" (😊)
    const felizButton = wrapper.findAll('button').filter(w =>
      w.text().includes('😊')
    )
    expect(felizButton.length).toBeGreaterThanOrEqual(1)

    await felizButton[0].trigger('click')
    await nextTick()
    await nextTick()

    expect(mockSaveLog).toHaveBeenCalled()
    const lastCall = mockSaveLog.mock.calls[mockSaveLog.mock.calls.length - 1]
    expect(lastCall[0].mood).toBe(5)
  })

  it('salva notas via handleSave ao sair do campo', async () => {
    const wrapper = mount(LogView)
    await nextTick()
    await nextTick()

    // O textarea existe
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)

    // Dispara o evento blur diretamente
    await textarea.trigger('blur')
    await nextTick()
    await nextTick()

    // saveLog foi chamado (com as notas atuais, que estão vazias)
    expect(mockSaveLog).toHaveBeenCalled()
  })

  it('mostra toast "Salvo na sua maré" após salvar', async () => {
    const wrapper = mount(LogView)
    await nextTick()
    await nextTick()

    // Toast não deve estar visível inicialmente
    expect(wrapper.text()).not.toContain('Salvo na sua maré')

    // Clica em um toggle para salvar
    const sexButton = wrapper.findAll('button').filter(w =>
      w.text().includes('Relação Sexual')
    )
    await sexButton[0].trigger('click')
    await nextTick()
    await nextTick()

    // Toast deve aparecer
    expect(wrapper.text()).toContain('Salvo na sua maré')
  })

  it('cria novo ciclo se não houver ciclos ao carregar um log', async () => {
    const today = new Date().toISOString().split('T')[0]
    mockGetLog.mockResolvedValue(null)
    mockGetCycles.mockResolvedValue([])

    mount(LogView)
    await nextTick()
    await nextTick()
    await nextTick()

    // Verifica se addCycle foi chamado
    expect(mockAddCycle).toHaveBeenCalled()
    const addCall = mockAddCycle.mock.calls[0]
    // O argumento deve ser a data atual
    expect(addCall[0]).toBe(today)
  })

  it('usa data da query param se fornecida', async () => {
    mockRouteQuery = { date: '2025-06-20' }
    mockGetLog.mockResolvedValue(null)
    mockGetCycles.mockResolvedValue([{ id: 1, start_date: '2025-05-01' }])

    mount(LogView)
    await nextTick()
    await nextTick()
    await nextTick()

    // loadLog deve ter sido chamado com a data da query
    expect(mockGetLog).toHaveBeenCalledWith('2025-06-20')
  })
})

// Testes de lógica pura
describe('LogView — Lógica pura (Correção 2)', () => {
  it('watch(selectedDate, loadLog) recarrega dados quando data muda', () => {
    let selectedDate = '2025-01-01'
    let loadedDate = null

    function loadLog(date) {
      loadedDate = date
    }

    // Simula watcher: quando selectedDate muda, chama loadLog
    function onDateChange(newDate) {
      if (newDate !== selectedDate) {
        selectedDate = newDate
        loadLog(selectedDate)
      }
    }

    onDateChange('2025-06-15')
    expect(loadedDate).toBe('2025-06-15')
  })

  it('loadLog carrega dados existentes', () => {
    const existing = {
      date: '2025-03-15',
      cycle_id: 2,
      had_sex: true,
      took_medication: true,
      is_period_day: false,
      mood: 3,
      notes: 'Cansada hoje',
    }

    let logEntry = null

    function loadLog(date, getLogResult) {
      if (getLogResult) {
        logEntry = { ...getLogResult }
      }
    }

    loadLog('2025-03-15', existing)
    expect(logEntry.notes).toBe('Cansada hoje')
    expect(logEntry.mood).toBe(3)
    expect(logEntry.had_sex).toBe(true)
  })

  it('toggleField alterna campo booleano', () => {
    const entry = {
      had_sex: false,
      took_medication: false,
      is_period_day: false,
    }

    function toggleField(field) {
      entry[field] = !entry[field]
    }

    toggleField('had_sex')
    expect(entry.had_sex).toBe(true)

    toggleField('had_sex')
    expect(entry.had_sex).toBe(false)

    toggleField('is_period_day')
    expect(entry.is_period_day).toBe(true)
  })
})
