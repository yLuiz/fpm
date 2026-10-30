import { describe, expect, it } from 'vitest'
import { formatDuration, minutesBetween, getMaintenanceStatus } from './format'

describe('formatDuration', () => {
  it('formata minutos, horas e dias', () => {
    expect(formatDuration(0)).toBe('0min')
    expect(formatDuration(45)).toBe('45min')
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(150)).toBe('2h 30min')
    expect(formatDuration(1440)).toBe('1d')
    expect(formatDuration(1440 + 180)).toBe('1d 3h')
  })
})

describe('minutesBetween', () => {
  it('usa o fim informado ou o agora', () => {
    expect(minutesBetween('2026-01-01T08:00:00Z', '2026-01-01T09:30:00Z')).toBe(90)
    expect(minutesBetween('2026-01-01T08:00:00Z', null, new Date('2026-01-01T08:20:00Z'))).toBe(20)
  })
})

describe('getMaintenanceStatus', () => {
  it('concluída, vencida ou agendada', () => {
    expect(getMaintenanceStatus('2000-01-01', 'DONE')).toBe('DONE')
    expect(getMaintenanceStatus('2000-01-01', 'SCHEDULED')).toBe('OVERDUE')
    expect(getMaintenanceStatus('2999-01-01', 'SCHEDULED')).toBe('SCHEDULED')
  })
})
