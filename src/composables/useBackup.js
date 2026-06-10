import { db } from '../db/database'

export function useBackup() {
  /**
   * Exporta todos os dados do banco para um arquivo JSON.
   * Dispara o download automaticamente via Blob.
   */
  async function exportData() {
    const user_settings = await db.user_settings.toArray()
    const cycles = await db.cycles.toArray()
    const daily_logs = await db.daily_logs.toArray()

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        user_settings,
        cycles,
        daily_logs
      }
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `mare-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  /**
   * Importa dados de um arquivo JSON de backup.
   * Valida a estrutura, limpa o banco e popula com os novos dados.
   */
  async function importData(file) {
    const text = await file.text()
    let payload

    try {
      payload = JSON.parse(text)
    } catch {
      throw new Error('Arquivo inválido. Não foi possível fazer o parse do JSON.')
    }

    if (!payload.version || !payload.data) {
      throw new Error('Estrutura de backup inválida. Verifique o arquivo.')
    }

    const { user_settings, cycles, daily_logs } = payload.data

    if (!Array.isArray(user_settings) || !Array.isArray(cycles) || !Array.isArray(daily_logs)) {
      throw new Error('Dados corrompidos. O backup deve conter as 3 tabelas.')
    }

    await db.transaction('rw', db.user_settings, db.cycles, db.daily_logs, async () => {
      await db.user_settings.clear()
      await db.cycles.clear()
      await db.daily_logs.clear()

      if (user_settings.length > 0) await db.user_settings.bulkAdd(user_settings)
      if (cycles.length > 0) await db.cycles.bulkAdd(cycles)
      if (daily_logs.length > 0) await db.daily_logs.bulkAdd(daily_logs)
    })
  }

  return {
    exportData,
    importData
  }
}
