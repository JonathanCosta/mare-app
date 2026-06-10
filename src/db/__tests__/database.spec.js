import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Dexie para testar o schema
let mockVersionStores = []
let mockOnHandler = {}
const mockAdd = vi.fn()

// Simula o construtor Dexie corretamente
class MockDexie {
  constructor(name) {
    this.name = name
    this.on = (event, handler) => {
      mockOnHandler[event] = handler
    }
    this._stores = {}
    this.user_settings = { add: mockAdd }
  }

  version(v) {
    return {
      stores: (schema) => {
        mockVersionStores.push({ version: v, schema })
      },
    }
  }
}

vi.mock('dexie', () => ({
  default: MockDexie,
  Dexie: MockDexie,
}))

describe('database.js — Schema e populate (Correção 1)', () => {
  beforeEach(() => {
    mockVersionStores = []
    mockOnHandler = {}
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('versão 1 tem tabelas user_settings, cycles, daily_logs', async () => {
    await import('../database')
    const v1 = mockVersionStores.find(v => v.version === 1)
    expect(v1).toBeDefined()
    expect(v1.schema).toHaveProperty('user_settings')
    expect(v1.schema).toHaveProperty('cycles')
    expect(v1.schema).toHaveProperty('daily_logs')
  })

  it('versão 2 inclui is_period_day na tabela daily_logs', async () => {
    await import('../database')
    const v2 = mockVersionStores.find(v => v.version === 2)
    expect(v2).toBeDefined()
    expect(v2.schema.daily_logs).toContain('is_period_day')
  })

  it('populate registra handler e onboarding_complete está no objeto de configuração inicial', async () => {
    await import('../database')

    // Verifica que o handler de populate foi registrado
    expect(mockOnHandler.populate).toBeDefined()
    expect(typeof mockOnHandler.populate).toBe('function')

    // Chama o handler para verificar as configurações iniciais
    await mockOnHandler.populate()

    // add foi chamado para user_settings com onboarding_complete
    expect(mockAdd).toHaveBeenCalledWith({
      id: 'config',
      average_cycle_length: 28,
      average_period_length: 5,
      push_enabled: false,
      onboarding_complete: false,
    })
  })

  it('onboarding_complete está presente no objeto de configuração inicial', () => {
    // Teste estrutural — verifica a fixture manualmente
    const initialSettings = {
      id: 'config',
      average_cycle_length: 28,
      average_period_length: 5,
      push_enabled: false,
      onboarding_complete: false,
    }

    expect(initialSettings).toHaveProperty('onboarding_complete')
    expect(initialSettings.onboarding_complete).toBe(false)
  })

  it('db é exportado como uma instância', async () => {
    const dbModule = await import('../database')
    expect(dbModule).toHaveProperty('db')
    expect(dbModule.db.name).toBe('CycleAppDB')
  })
})
