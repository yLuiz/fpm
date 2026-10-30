/** Formatação e faixas de cor dos indicadores. */

export const COMPLIANCE_TARGET = 0.9

export function percent(rate: number | null | undefined, digits = 0) {
  if (rate === null || rate === undefined) return '—'
  return `${(rate * 100).toFixed(digits).replace('.', ',')}%`
}

/** Cor do cumprimento: verde na meta, amarelo até 75%, vinho abaixo. */
export function complianceTone(rate: number | null | undefined) {
  if (rate === null || rate === undefined) return 'text-foreground'
  if (rate >= COMPLIANCE_TARGET) return 'text-success-text'
  if (rate >= 0.75) return 'text-warning-text'
  return 'text-danger-text'
}

/** Cor da disponibilidade: verde ≥ 98%, amarelo ≥ 95%, vinho abaixo. */
export function availabilityTone(rate: number | null | undefined) {
  if (rate === null || rate === undefined) return 'text-foreground'
  if (rate >= 0.98) return 'text-success-text'
  if (rate >= 0.95) return 'text-warning-text'
  return 'text-danger-text'
}

/** Parcela das paradas que aconteceram com preventiva vencida. */
export function overdueShare(series: { downtimes: number; withOverduePreventive: number }[]) {
  const total = series.reduce((s, m) => s + m.downtimes, 0)
  if (total === 0) return null
  return series.reduce((s, m) => s + m.withOverduePreventive, 0) / total
}
