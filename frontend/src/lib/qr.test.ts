import { describe, expect, it } from 'vitest'
import { equipmentScanUrl, scanTarget } from './qr'
import type { Maintenance } from '@/types'

const now = new Date('2026-10-24T10:00:00')

function m(id: string, kind: Maintenance['kind'], dueDate: string, status: Maintenance['status'] = 'SCHEDULED'): Maintenance {
  return { id, kind, dueDate, status, equipmentId: 'e1', createdAt: '2026-01-01' }
}

describe('scanTarget', () => {
  it('corretiva aberta tem prioridade sobre a preventiva vencida', () => {
    const target = scanTarget(
      { id: 'e1', maintenances: [m('p1', 'PREVENTIVE', '2026-10-01T08:00:00'), m('c1', 'CORRECTIVE', '2026-10-30T08:00:00')] },
      now
    )
    expect(target).toBe('/maintenance/c1/register')
  })

  it('preventiva vencida ou a vencer em até 3 dias abre o registro', () => {
    expect(scanTarget({ id: 'e1', maintenances: [m('p1', 'PREVENTIVE', '2026-10-20T08:00:00')] }, now)).toBe(
      '/maintenance/p1/register'
    )
    expect(scanTarget({ id: 'e1', maintenances: [m('p2', 'PREVENTIVE', '2026-10-27T08:00:00')] }, now)).toBe(
      '/maintenance/p2/register'
    )
  })

  it('preventiva distante ou só concluídas: abre o detalhe do equipamento', () => {
    expect(scanTarget({ id: 'e1', maintenances: [m('p3', 'PREVENTIVE', '2026-11-20T08:00:00')] }, now)).toBe(
      '/equipment/e1'
    )
    expect(
      scanTarget({ id: 'e1', maintenances: [m('c9', 'CORRECTIVE', '2026-10-01T08:00:00', 'DONE')] }, now)
    ).toBe('/equipment/e1')
    expect(scanTarget({ id: 'e1' }, now)).toBe('/equipment/e1')
  })
})

describe('equipmentScanUrl', () => {
  it('usa a origem da página quando VITE_PUBLIC_URL não está definida', () => {
    expect(equipmentScanUrl('abc')).toBe(`${window.location.origin}/e/abc`)
  })
})
