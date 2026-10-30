export type EquipmentType = 'MOTOR' | 'COMPRESSOR' | 'PUMP' | 'CONVEYOR' | 'PANEL'
export type Criticality = 'LOW' | 'MEDIUM' | 'HIGH'
export type EquipmentStatus = 'ACTIVE' | 'INACTIVE'
export type MaintenanceStatus = 'SCHEDULED' | 'DONE'
export type MaintenanceKind = 'PREVENTIVE' | 'CORRECTIVE'
export type ChecklistResultValue = 'OK' | 'NOK' | 'NA'

export interface ChecklistResult {
  item: string
  result: ChecklistResultValue
  note?: string
}
export type UserRole = 'ADMIN' | 'USER'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface Equipment {
  id: string
  name: string
  type: EquipmentType
  location: string
  criticality: Criticality
  status: EquipmentStatus
  createdAt: string
  maintenances?: Maintenance[]
  /** Parada em andamento (lista com 0 ou 1 item) */
  downtimes?: Pick<Downtime, 'id' | 'startedAt' | 'cause' | 'description'>[]
}

export type DowntimeCause = 'MECHANICAL' | 'ELECTRICAL' | 'OPERATIONAL' | 'OTHER'

export interface Downtime {
  id: string
  equipmentId: string
  startedAt: string
  endedAt: string | null
  cause: DowntimeCause
  description: string
  /** O equipamento tinha preventiva vencida quando parou */
  preventiveOverdue: boolean
  correctiveId: string | null
  equipment?: Pick<Equipment, 'id' | 'name' | 'type' | 'location' | 'criticality'>
  corrective?: Pick<Maintenance, 'id' | 'status' | 'dueDate'> | null
}

export interface CreateDowntimeDto {
  equipmentId: string
  startedAt?: string
  cause: DowntimeCause
  description: string
  openCorrective?: boolean
}

export interface DowntimeQuery {
  equipmentId?: string
  open?: boolean
  from?: string
  to?: string
}

export interface Maintenance {
  id: string
  equipmentId: string
  dueDate: string
  concludedAt?: string
  status: MaintenanceStatus
  kind: MaintenanceKind
  /** Preventiva que originou a corretiva */
  originId?: string | null
  /** O que precisa ser corrigido (corretivas) */
  description?: string | null
  /** Formato atual: ChecklistResult[]; registros antigos: lista de itens marcados */
  checklist?: ChecklistResult[] | string[] | null
  observations?: string | null
  createdAt: string
  equipment?: Equipment
  origin?: Pick<Maintenance, 'id' | 'dueDate' | 'concludedAt' | 'checklist'> | null
  correctives?: Pick<Maintenance, 'id' | 'status' | 'dueDate' | 'concludedAt'>[]
}

export interface CompleteMaintenanceResult {
  maintenance: Maintenance
  next: Maintenance | null
  corrective: Maintenance | null
}

export interface FrequencySetting {
  equipmentType: EquipmentType
  frequencyDays: number
}

export interface DashboardStats {
  upcoming: number
  overdue: number
  completedThisMonth: number
  openCorrectives: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface AuthResponse extends AuthTokens {
  user: User
}

export interface CreateEquipmentDto {
  name: string
  type: EquipmentType
  location: string
  criticality: Criticality
}

export interface CompleteMaintenanceDto {
  concludedAt?: string
  checklist?: ChecklistResult[]
  observations?: string
}

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  MOTOR: 'Motor Elétrico',
  COMPRESSOR: 'Compressor de Ar',
  PUMP: 'Bomba Industrial',
  CONVEYOR: 'Esteira Transportadora',
  PANEL: 'Painel Elétrico',
}

export const CRITICALITY_LABELS: Record<Criticality, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
}

export const STATUS_LABELS: Record<EquipmentStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
}

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus | 'OVERDUE', string> = {
  SCHEDULED: 'Agendada',
  DONE: 'Concluída',
  OVERDUE: 'Vencida',
}

export const MAINTENANCE_KIND_LABELS: Record<MaintenanceKind, string> = {
  PREVENTIVE: 'Preventiva',
  CORRECTIVE: 'Corretiva',
}

export const CHECKLIST_RESULT_LABELS: Record<ChecklistResultValue, string> = {
  OK: 'OK',
  NOK: 'Não OK',
  NA: 'N.A.',
}

export const DOWNTIME_CAUSE_LABELS: Record<DowntimeCause, string> = {
  MECHANICAL: 'Mecânica',
  ELECTRICAL: 'Elétrica',
  OPERATIONAL: 'Operacional',
  OTHER: 'Outra',
}

export interface MetricsSummary {
  from: string
  to: string
  equipmentCount: number
  compliance: { due: number; onTime: number; rate: number | null }
  avgDelayDays: number | null
  downtime: {
    count: number
    withOverduePreventive: number
    withPreventiveOnTime: number
    totalMinutes: number
    mttrMinutes: number | null
    mtbfHours: number | null
    availability: number | null
  }
}

export interface MonthlyMetric {
  month: string
  label: string
  complianceRate: number | null
  due: number
  onTime: number
  downtimes: number
  withOverduePreventive: number
  withPreventiveOnTime: number
  downtimeMinutes: number
}
