import type { ChecklistResult, Criticality, Maintenance } from '@/types'

/**
 * Normaliza o checklist salvo: o formato antigo (lista de itens marcados)
 * é exibido como "OK" em cada item.
 */
export function normalizeChecklist(checklist: Maintenance['checklist']): ChecklistResult[] {
  if (!Array.isArray(checklist)) return []
  return checklist.map((entry) =>
    typeof entry === 'string' ? { item: entry, result: 'OK' as const } : entry
  )
}

export function checklistSummary(results: ChecklistResult[]) {
  return {
    ok: results.filter((r) => r.result === 'OK').length,
    nok: results.filter((r) => r.result === 'NOK').length,
    na: results.filter((r) => r.result === 'NA').length,
    total: results.length,
  }
}

/** Preventiva só pode ser enviada com todos os itens respondidos e nota em cada "Não OK". */
export function checklistErrors(expected: string[], answers: Record<string, ChecklistResult>) {
  const errors: string[] = []
  const missing = expected.filter((item) => !answers[item])
  if (missing.length > 0) errors.push(`Responda todos os itens (${missing.length} pendente(s))`)
  for (const item of expected) {
    const a = answers[item]
    if (a?.result === 'NOK' && !a.note?.trim()) errors.push(`Descreva o problema em "${item}"`)
  }
  return errors
}

/** Prazo (dias) da corretiva pela criticidade; espelha a regra do backend. */
export const CORRECTIVE_DUE_DAYS: Record<Criticality, number> = {
  HIGH: 1,
  MEDIUM: 3,
  LOW: 7,
}
