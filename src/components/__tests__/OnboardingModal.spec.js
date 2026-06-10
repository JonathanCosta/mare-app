import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// Mock da dependência useDatabase
const mockUpdateSettings = vi.fn()
const mockAddCycle = vi.fn()
const mockSaveLog = vi.fn()

vi.mock('../../composables/useDatabase', () => ({
  useDatabase: () => ({
    updateSettings: mockUpdateSettings,
    addCycle: mockAddCycle,
    saveLog: mockSaveLog,
  }),
}))

import OnboardingModal from '../OnboardingModal.vue'

describe('OnboardingModal.vue — Correção 1: Onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddCycle.mockResolvedValue(1)
    mockUpdateSettings.mockResolvedValue(undefined)
    mockSaveLog.mockResolvedValue(undefined)
  })

  function createWrapper(props = {}) {
    return mount(OnboardingModal, {
      props: { show: true, ...props },
      attachTo: document.body,
      global: {
        stubs: {
          Teleport: {
            template: '<div><slot /></div>',
          },
        },
      },
    })
  }

  it('renderiza o modal quando show=true', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Bem-vinda à Maré')
    expect(wrapper.text()).toContain('Começar')
  })

  it('não renderiza quando show=false', () => {
    const wrapper = mount(OnboardingModal, {
      props: { show: false },
      global: {
        stubs: {
          Teleport: {
            template: '<div><slot /></div>',
          },
        },
      },
    })
    expect(wrapper.find('h2').exists()).toBe(false)
  })

  it('botão "Começar" está desabilitado quando formulário está vazio', () => {
    const wrapper = createWrapper()
    // Pega o último button que é o "Começar"
    const allButtons = wrapper.findAll('button')
    const comecarBtn = allButtons[allButtons.length - 1]
    expect(comecarBtn.attributes('disabled')).toBeDefined()
  })

  it('canSave é false quando start_date está vazio (mesmo com valores numéricos default)', async () => {
    const wrapper = createWrapper()
    await nextTick()

    const allButtons = wrapper.findAll('button')
    const comecarBtn = allButtons[allButtons.length - 1]
    expect(comecarBtn.attributes('disabled')).toBeDefined()
  })

  it('canSave é true quando todos os campos obrigatórios são preenchidos', async () => {
    const wrapper = createWrapper()

    // Encontra inputs
    const numberInputs = wrapper.findAll('input[type="number"]')
    expect(numberInputs.length).toBe(2)

    const dateInputs = wrapper.findAll('input[type="date"]')
    expect(dateInputs.length).toBe(2)

    // Preenche os campos
    await numberInputs[0].setValue(28)
    await numberInputs[1].setValue(5)
    await dateInputs[0].setValue('2025-01-01')
    await dateInputs[1].setValue('2025-01-05')

    await nextTick()
    await nextTick()

    const allButtons = wrapper.findAll('button')
    const comecarBtn = allButtons[allButtons.length - 1]
    expect(comecarBtn.attributes('disabled')).toBeUndefined()
  })

  it('handleSave chama updateSettings, addCycle e saveLog para cada dia', async () => {
    // Usa resolved imediata para simplificar a sincronização
    mockUpdateSettings.mockResolvedValue(undefined)

    const wrapper = createWrapper()

    // Preenche formulário completo
    const numberInputs = wrapper.findAll('input[type="number"]')
    await numberInputs[0].setValue(28)
    await numberInputs[1].setValue(5)

    const dateInputs = wrapper.findAll('input[type="date"]')
    await dateInputs[0].setValue('2025-02-01')
    await dateInputs[1].setValue('2025-02-05')

    await nextTick()
    await nextTick()

    // Clica em Começar
    const allButtons = wrapper.findAll('button')
    const comecarBtn = allButtons[allButtons.length - 1]
    await comecarBtn.trigger('click')

    // Flush todas as promises microtask
    await new Promise(resolve => setTimeout(resolve, 0))
    await nextTick()

    // Verifica updateSettings
    expect(mockUpdateSettings).toHaveBeenCalledWith({
      average_cycle_length: 28,
      average_period_length: 5,
      push_enabled: false,
      onboarding_complete: true,
    })

    // Verifica addCycle
    expect(mockAddCycle).toHaveBeenCalledWith('2025-02-01')

    // Verifica saveLog para cada dia
    expect(mockSaveLog).toHaveBeenCalledTimes(5)
    expect(mockSaveLog).toHaveBeenCalledWith({
      date: '2025-02-01',
      cycle_id: 1,
      had_sex: false,
      took_medication: false,
      is_period_day: true,
      mood: null,
      notes: '',
    })
    expect(mockSaveLog).toHaveBeenCalledWith({
      date: '2025-02-05',
      cycle_id: 1,
      had_sex: false,
      took_medication: false,
      is_period_day: true,
      mood: null,
      notes: '',
    })
  })

  it('emite "complete" após salvar com sucesso', async () => {
    const wrapper = createWrapper()

    const numberInputs = wrapper.findAll('input[type="number"]')
    await numberInputs[0].setValue(28)
    await numberInputs[1].setValue(5)

    const dateInputs = wrapper.findAll('input[type="date"]')
    await dateInputs[0].setValue('2025-03-01')
    await dateInputs[1].setValue('2025-03-01')

    await nextTick()
    await nextTick()

    const allButtons = wrapper.findAll('button')
    const comecarBtn = allButtons[allButtons.length - 1]
    await comecarBtn.trigger('click')

    expect(wrapper.emitted('complete')).toBeTruthy()
  })

  it('botão fica desabilitado durante salvamento (saving=true)', async () => {
    // Faz o mock demorar
    mockUpdateSettings.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    const wrapper = createWrapper()

    const numberInputs = wrapper.findAll('input[type="number"]')
    await numberInputs[0].setValue(28)
    await numberInputs[1].setValue(5)

    const dateInputs = wrapper.findAll('input[type="date"]')
    await dateInputs[0].setValue('2025-04-01')
    await dateInputs[1].setValue('2025-04-03')

    await nextTick()
    await nextTick()

    const allButtons = wrapper.findAll('button')
    const comecarBtn = allButtons[allButtons.length - 1]
    await comecarBtn.trigger('click')

    // Durante o salvamento, o botão deve estar desabilitado
    expect(comecarBtn.attributes('disabled')).toBeDefined()
  })
})
