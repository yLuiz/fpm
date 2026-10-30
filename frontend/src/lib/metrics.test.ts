import { describe, expect, it } from 'vitest'
import { availabilityTone, complianceTone, overdueShare, percent } from './metrics'

describe('percent', () => {
  it('formata em pt-BR e trata ausência', () => {
    expect(percent(0.8333)).toBe('83%')
    expect(percent(0.99375, 1)).toBe('99,4%')
    expect(percent(null)).toBe('—')
  })
})

describe('faixas de cor', () => {
  it('cumprimento: meta 90%, alerta até 75%', () => {
    expect(complianceTone(0.95)).toBe('text-success-text')
    expect(complianceTone(0.8)).toBe('text-warning-text')
    expect(complianceTone(0.5)).toBe('text-danger-text')
    expect(complianceTone(null)).toBe('text-foreground')
  })

  it('disponibilidade: 98% e 95%', () => {
    expect(availabilityTone(0.99)).toBe('text-success-text')
    expect(availabilityTone(0.96)).toBe('text-warning-text')
    expect(availabilityTone(0.9)).toBe('text-danger-text')
  })
})

describe('overdueShare', () => {
  it('parcela das paradas com preventiva vencida', () => {
    expect(
      overdueShare([
        { downtimes: 3, withOverduePreventive: 2 },
        { downtimes: 1, withOverduePreventive: 1 },
      ])
    ).toBe(0.75)
    expect(overdueShare([{ downtimes: 0, withOverduePreventive: 0 }])).toBeNull()
  })
})
