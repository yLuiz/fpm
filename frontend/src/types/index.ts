export type EquipmentType = 'MOTOR' | 'COMPRESSOR' | 'PUMP' | 'CONVEYOR' | 'PANEL'
export type Criticality = 'LOW' | 'MEDIUM' | 'HIGH'
export type EquipmentStatus = 'ACTIVE' | 'INACTIVE'
export type MaintenanceStatus = 'SCHEDULED' | 'DONE'
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
}

export interface Maintenance {
  id: string
  equipmentId: string
  dueDate: string
  concludedAt?: string
  status: MaintenanceStatus
  checklist?: string[]
  observations?: string
  createdAt: string
  equipment?: Equipment
}

export interface FrequencySetting {
  equipmentType: EquipmentType
  frequencyDays: number
}

export interface DashboardStats {
  upcoming: number
  overdue: number
  completedThisMonth: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
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
  checklist: string[]
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
