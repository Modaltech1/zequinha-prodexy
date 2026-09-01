import type {
  FinancialReport,
  FinancialReportFilters,
} from '@/features/financial/domain/report'

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

export async function getFinancialReport(
  filters: FinancialReportFilters
): Promise<FinancialReport> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }

  try {
    const response = await fetch(`/api/admin/financeiro?${params.toString()}`, {
      cache: 'no-store',
    })
    const body: unknown = await response.json()
    const record = readRecord(body)

    if (!response.ok) {
      throw new Error(
        typeof record?.error === 'string'
          ? record.error
          : 'Não foi possível carregar o relatório financeiro.'
      )
    }

    return body as FinancialReport
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.')
  }
}
