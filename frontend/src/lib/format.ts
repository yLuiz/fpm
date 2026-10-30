import type { Criticality, EquipmentStatus } from '@/types'

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

export function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('pt-BR')
}

/** Valor para <input type="datetime-local"> a partir de um Date. */
export function toDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

export function isOverdue(dateString: string, status?: string) {
  if (status === 'DONE') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(dateString)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

/** Status efetivo de uma manutenção considerando vencimento. */
export function getMaintenanceStatus(dueDate: string, status: string): 'DONE' | 'OVERDUE' | 'SCHEDULED' {
  if (status === 'DONE') return 'DONE'
  return isOverdue(dueDate, status) ? 'OVERDUE' : 'SCHEDULED'
}

type BadgeVariant = 'success' | 'warning' | 'info' | 'destructive' | 'secondary' | 'default'

export const criticalityVariant: Record<Criticality, BadgeVariant> = {
  HIGH: 'destructive',
  MEDIUM: 'warning',
  LOW: 'success',
}

export const equipmentStatusVariant: Record<EquipmentStatus, BadgeVariant> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
}

export const maintenanceStatusVariant: Record<'DONE' | 'OVERDUE' | 'SCHEDULED', BadgeVariant> = {
  DONE: 'success',
  OVERDUE: 'destructive',
  SCHEDULED: 'info',
}

/** Duração legível a partir de minutos: "45min", "2h 30min", "1d 3h". */
export function formatDuration(totalMinutes: number) {
  const m = Math.max(0, Math.round(totalMinutes))
  const days = Math.floor(m / 1440)
  const hours = Math.floor((m % 1440) / 60)
  const minutes = m % 60
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
  return `${minutes}min`
}

/** Minutos entre início e fim (ou agora, se ainda em andamento). */
export function minutesBetween(start: string, end: string | null, now = new Date()) {
  const endMs = end ? new Date(end).getTime() : now.getTime()
  return Math.max(0, (endMs - new Date(start).getTime()) / 60000)
}
