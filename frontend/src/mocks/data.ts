import type { User, Equipment, Maintenance, DashboardStats, FrequencySetting, EquipmentType } from '../types'

// Mock Users
export const mockUsers: (User & { password: string })[] = [
  {
    id: 'usr_001',
    email: 'admin@fpm.com',
    name: 'Administrador',
    role: 'ADMIN',
    password: 'admin123',
  },
  {
    id: 'usr_002',
    email: 'user@fpm.com',
    name: 'Usuário Padrão',
    role: 'USER',
    password: 'user123',
  },
  {
    id: 'usr_003',
    email: 'joao@fpm.com',
    name: 'João Silva',
    role: 'USER',
    password: '123456',
  },
]

// Helper to generate dates
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const today = new Date()

// Mock Equipment
export const mockEquipment: Equipment[] = [
  {
    id: 'eq_001',
    name: 'Motor Principal Linha 1',
    type: 'MOTOR',
    location: 'Galpão A - Setor 1',
    criticality: 'HIGH',
    status: 'ACTIVE',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'eq_002',
    name: 'Motor Auxiliar Linha 2',
    type: 'MOTOR',
    location: 'Galpão A - Setor 2',
    criticality: 'MEDIUM',
    status: 'ACTIVE',
    createdAt: '2024-01-20T14:30:00Z',
  },
  {
    id: 'eq_003',
    name: 'Compressor Industrial 01',
    type: 'COMPRESSOR',
    location: 'Sala de Compressores',
    criticality: 'HIGH',
    status: 'ACTIVE',
    createdAt: '2024-02-01T09:00:00Z',
  },
  {
    id: 'eq_004',
    name: 'Compressor Backup 02',
    type: 'COMPRESSOR',
    location: 'Sala de Compressores',
    criticality: 'MEDIUM',
    status: 'INACTIVE',
    createdAt: '2024-02-05T11:00:00Z',
  },
  {
    id: 'eq_005',
    name: 'Bomba Hidráulica Principal',
    type: 'PUMP',
    location: 'Casa de Bombas',
    criticality: 'HIGH',
    status: 'ACTIVE',
    createdAt: '2024-02-10T08:00:00Z',
  },
  {
    id: 'eq_006',
    name: 'Bomba de Refrigeração',
    type: 'PUMP',
    location: 'Setor de Refrigeração',
    criticality: 'MEDIUM',
    status: 'ACTIVE',
    createdAt: '2024-02-15T16:00:00Z',
  },
  {
    id: 'eq_007',
    name: 'Esteira Transportadora Linha A',
    type: 'CONVEYOR',
    location: 'Galpão B - Linha A',
    criticality: 'HIGH',
    status: 'ACTIVE',
    createdAt: '2024-03-01T07:30:00Z',
  },
  {
    id: 'eq_008',
    name: 'Esteira Transportadora Linha B',
    type: 'CONVEYOR',
    location: 'Galpão B - Linha B',
    criticality: 'MEDIUM',
    status: 'ACTIVE',
    createdAt: '2024-03-05T10:00:00Z',
  },
  {
    id: 'eq_009',
    name: 'Painel Elétrico Principal',
    type: 'PANEL',
    location: 'Sala Elétrica Central',
    criticality: 'HIGH',
    status: 'ACTIVE',
    createdAt: '2024-03-10T09:00:00Z',
  },
  {
    id: 'eq_010',
    name: 'QDC Setor Administrativo',
    type: 'PANEL',
    location: 'Prédio Administrativo',
    criticality: 'LOW',
    status: 'ACTIVE',
    createdAt: '2024-03-15T14:00:00Z',
  },
]

// Mock Maintenances
export const mockMaintenances: Maintenance[] = [
  // Overdue maintenances
  {
    id: 'mnt_001',
    equipmentId: 'eq_001',
    dueDate: addDays(today, -5).toISOString(),
    status: 'SCHEDULED',
    createdAt: addDays(today, -35).toISOString(),
  },
  {
    id: 'mnt_002',
    equipmentId: 'eq_003',
    dueDate: addDays(today, -2).toISOString(),
    status: 'SCHEDULED',
    createdAt: addDays(today, -17).toISOString(),
  },
  // Upcoming maintenances (within 3 days)
  {
    id: 'mnt_003',
    equipmentId: 'eq_005',
    dueDate: addDays(today, 1).toISOString(),
    status: 'SCHEDULED',
    createdAt: addDays(today, -29).toISOString(),
  },
  {
    id: 'mnt_004',
    equipmentId: 'eq_007',
    dueDate: addDays(today, 2).toISOString(),
    status: 'SCHEDULED',
    createdAt: addDays(today, -13).toISOString(),
  },
  {
    id: 'mnt_005',
    equipmentId: 'eq_009',
    dueDate: addDays(today, 3).toISOString(),
    status: 'SCHEDULED',
    createdAt: addDays(today, -57).toISOString(),
  },
  // Future maintenances
  {
    id: 'mnt_006',
    equipmentId: 'eq_002',
    dueDate: addDays(today, 10).toISOString(),
    status: 'SCHEDULED',
    createdAt: addDays(today, -20).toISOString(),
  },
  {
    id: 'mnt_007',
    equipmentId: 'eq_006',
    dueDate: addDays(today, 15).toISOString(),
    status: 'SCHEDULED',
    createdAt: addDays(today, -15).toISOString(),
  },
  {
    id: 'mnt_008',
    equipmentId: 'eq_008',
    dueDate: addDays(today, 8).toISOString(),
    status: 'SCHEDULED',
    createdAt: addDays(today, -7).toISOString(),
  },
  {
    id: 'mnt_009',
    equipmentId: 'eq_010',
    dueDate: addDays(today, 45).toISOString(),
    status: 'SCHEDULED',
    createdAt: addDays(today, -15).toISOString(),
  },
  // Completed maintenances (this month)
  {
    id: 'mnt_010',
    equipmentId: 'eq_001',
    dueDate: addDays(today, -10).toISOString(),
    concludedAt: addDays(today, -9).toISOString(),
    status: 'DONE',
    checklist: ['Verificar tensão', 'Lubrificar rolamentos', 'Verificar temperatura'],
    observations: 'Manutenção realizada sem problemas',
    createdAt: addDays(today, -40).toISOString(),
  },
  {
    id: 'mnt_011',
    equipmentId: 'eq_003',
    dueDate: addDays(today, -15).toISOString(),
    concludedAt: addDays(today, -14).toISOString(),
    status: 'DONE',
    checklist: ['Verificar pressão', 'Drenar condensado', 'Verificar correias'],
    observations: 'Trocada correia desgastada',
    createdAt: addDays(today, -30).toISOString(),
  },
  {
    id: 'mnt_012',
    equipmentId: 'eq_005',
    dueDate: addDays(today, -20).toISOString(),
    concludedAt: addDays(today, -19).toISOString(),
    status: 'DONE',
    checklist: ['Verificar vazamentos', 'Verificar pressão', 'Lubrificar selos'],
    createdAt: addDays(today, -50).toISOString(),
  },
  {
    id: 'mnt_013',
    equipmentId: 'eq_007',
    dueDate: addDays(today, -12).toISOString(),
    concludedAt: addDays(today, -12).toISOString(),
    status: 'DONE',
    checklist: ['Verificar tensão da correia', 'Lubrificar roletes', 'Verificar alinhamento'],
    observations: 'Ajustado tensionamento da correia',
    createdAt: addDays(today, -27).toISOString(),
  },
  {
    id: 'mnt_014',
    equipmentId: 'eq_009',
    dueDate: addDays(today, -25).toISOString(),
    concludedAt: addDays(today, -24).toISOString(),
    status: 'DONE',
    checklist: ['Verificar conexões', 'Limpar contatos', 'Verificar disjuntores'],
    createdAt: addDays(today, -85).toISOString(),
  },
]

// Mock Frequency Settings
export const mockFrequencySettings: FrequencySetting[] = [
  { equipmentType: 'MOTOR', frequencyDays: 30 },
  { equipmentType: 'COMPRESSOR', frequencyDays: 15 },
  { equipmentType: 'PUMP', frequencyDays: 30 },
  { equipmentType: 'CONVEYOR', frequencyDays: 15 },
  { equipmentType: 'PANEL', frequencyDays: 60 },
]

// Checklist items per equipment type
export const mockChecklists: Record<EquipmentType, string[]> = {
  MOTOR: [
    'Verificar tensão de alimentação',
    'Medir corrente de operação',
    'Verificar temperatura dos mancais',
    'Lubrificar rolamentos',
    'Verificar nível de vibração',
    'Inspecionar isolamento elétrico',
    'Verificar fixação do motor',
    'Limpar ventilador e carcaça',
  ],
  COMPRESSOR: [
    'Verificar nível de óleo',
    'Drenar condensado do reservatório',
    'Verificar pressão de trabalho',
    'Inspecionar correias e polias',
    'Verificar válvula de segurança',
    'Limpar filtro de ar',
    'Verificar vazamentos',
    'Testar pressostato',
  ],
  PUMP: [
    'Verificar vazamentos nas conexões',
    'Verificar pressão de sucção/descarga',
    'Lubrificar selos mecânicos',
    'Verificar alinhamento do acoplamento',
    'Verificar vibração anormal',
    'Inspecionar gaxetas',
    'Verificar temperatura do motor',
    'Limpar filtro de entrada',
  ],
  CONVEYOR: [
    'Verificar tensão da correia',
    'Lubrificar roletes e mancais',
    'Verificar alinhamento da correia',
    'Inspecionar condição da correia',
    'Verificar sistema de freio',
    'Testar botões de emergência',
    'Verificar guias laterais',
    'Limpar sensores de posição',
  ],
  PANEL: [
    'Verificar aperto das conexões',
    'Limpar contatos dos disjuntores',
    'Verificar aquecimento anormal',
    'Testar funcionamento dos disjuntores',
    'Verificar isolamento dos cabos',
    'Inspecionar barramentos',
    'Verificar indicadores e sinalizações',
    'Limpar interior do painel',
  ],
}

// Helper function to calculate dashboard stats
export function calculateStats(): DashboardStats {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const upcoming = mockMaintenances.filter(m => {
    if (m.status !== 'SCHEDULED') return false
    const dueDate = new Date(m.dueDate)
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 3
  }).length

  const overdue = mockMaintenances.filter(m => {
    if (m.status !== 'SCHEDULED') return false
    const dueDate = new Date(m.dueDate)
    return dueDate < now
  }).length

  const completedThisMonth = mockMaintenances.filter(m => {
    if (m.status !== 'DONE' || !m.concludedAt) return false
    const concludedDate = new Date(m.concludedAt)
    return concludedDate >= startOfMonth
  }).length

  return { upcoming, overdue, completedThisMonth }
}

// Get maintenance with equipment data
export function getMaintenanceWithEquipment(maintenance: Maintenance): Maintenance {
  const equipment = mockEquipment.find(e => e.id === maintenance.equipmentId)
  return { ...maintenance, equipment }
}
