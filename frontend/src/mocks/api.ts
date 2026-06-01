import type {
  AuthResponse,
  LoginCredentials,
  Equipment,
  Maintenance,
  DashboardStats,
  FrequencySetting,
  CreateEquipmentDto,
  CompleteMaintenanceDto,
  User,
  EquipmentType,
} from '../types'
import {
  mockUsers,
  mockEquipment,
  mockMaintenances,
  mockFrequencySettings,
  mockChecklists,
  calculateStats,
  getMaintenanceWithEquipment,
} from './data'

// Simulates network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// In-memory storage (persists during session)
let equipment = [...mockEquipment]
let maintenances = [...mockMaintenances]
let frequencySettings = [...mockFrequencySettings]

// Generate unique IDs
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const mockAuthApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    await delay(500)
    
    const user = mockUsers.find(
      u => u.email === credentials.email && u.password === credentials.password
    )
    
    if (!user) {
      throw new Error('Credenciais inválidas')
    }
    
    const { password: _, ...userWithoutPassword } = user
    
    return {
      access_token: `mock_token_${user.id}_${Date.now()}`,
      user: userWithoutPassword,
    }
  },

  me: async (): Promise<User> => {
    await delay(200)
    
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      throw new Error('Não autenticado')
    }
    
    return JSON.parse(storedUser)
  },
}

export const mockEquipmentApi = {
  getAll: async (status?: string): Promise<Equipment[]> => {
    await delay(300)
    
    let result = equipment
    if (status) {
      result = result.filter(e => e.status === status)
    }
    
    return result.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },

  getById: async (id: string): Promise<Equipment> => {
    await delay(200)
    
    const item = equipment.find(e => e.id === id)
    if (!item) {
      throw new Error('Equipamento não encontrado')
    }
    
    // Include maintenances for this equipment
    const equipmentMaintenances = maintenances
      .filter(m => m.equipmentId === id)
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
    
    return { ...item, maintenances: equipmentMaintenances }
  },

  create: async (data: CreateEquipmentDto): Promise<Equipment> => {
    await delay(400)
    
    const newEquipment: Equipment = {
      id: generateId('eq'),
      ...data,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    }
    
    equipment.push(newEquipment)
    
    // Create initial maintenance for the new equipment
    const frequencySetting = frequencySettings.find(f => f.equipmentType === data.type)
    const frequencyDays = frequencySetting?.frequencyDays ?? 30
    
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + frequencyDays)
    
    const newMaintenance: Maintenance = {
      id: generateId('mnt'),
      equipmentId: newEquipment.id,
      dueDate: dueDate.toISOString(),
      status: 'SCHEDULED',
      createdAt: new Date().toISOString(),
    }
    
    maintenances.push(newMaintenance)
    
    return newEquipment
  },

  update: async (id: string, data: Partial<CreateEquipmentDto>): Promise<Equipment> => {
    await delay(400)
    
    const index = equipment.findIndex(e => e.id === id)
    if (index === -1) {
      throw new Error('Equipamento não encontrado')
    }
    
    equipment[index] = { ...equipment[index], ...data }
    return equipment[index]
  },

  toggleStatus: async (id: string): Promise<Equipment> => {
    await delay(300)
    
    const index = equipment.findIndex(e => e.id === id)
    if (index === -1) {
      throw new Error('Equipamento não encontrado')
    }
    
    equipment[index] = {
      ...equipment[index],
      status: equipment[index].status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    }
    
    return equipment[index]
  },

  delete: async (id: string): Promise<void> => {
    await delay(300)
    
    equipment = equipment.filter(e => e.id !== id)
    maintenances = maintenances.filter(m => m.equipmentId !== id)
  },
}

export const mockMaintenanceApi = {
  getUpcoming: async (days: number = 3): Promise<Maintenance[]> => {
    await delay(300)
    
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    return maintenances
      .filter(m => {
        if (m.status !== 'SCHEDULED') return false
        const dueDate = new Date(m.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays >= 0 && diffDays <= days
      })
      .map(getMaintenanceWithEquipment)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  },

  getOverdue: async (): Promise<Maintenance[]> => {
    await delay(300)
    
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    return maintenances
      .filter(m => {
        if (m.status !== 'SCHEDULED') return false
        const dueDate = new Date(m.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate < now
      })
      .map(getMaintenanceWithEquipment)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  },

  getByEquipment: async (equipmentId: string): Promise<Maintenance[]> => {
    await delay(200)
    
    return maintenances
      .filter(m => m.equipmentId === equipmentId)
      .map(getMaintenanceWithEquipment)
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
  },

  getById: async (id: string): Promise<Maintenance> => {
    await delay(200)
    
    const maintenance = maintenances.find(m => m.id === id)
    if (!maintenance) {
      throw new Error('Manutenção não encontrada')
    }
    
    return getMaintenanceWithEquipment(maintenance)
  },

  complete: async (id: string, dto: CompleteMaintenanceDto): Promise<Maintenance> => {
    await delay(400)
    
    const index = maintenances.findIndex(m => m.id === id)
    if (index === -1) {
      throw new Error('Manutenção não encontrada')
    }
    
    const maintenance = maintenances[index]
    const equipmentItem = equipment.find(e => e.id === maintenance.equipmentId)
    
    // Mark current maintenance as done
    maintenances[index] = {
      ...maintenance,
      status: 'DONE',
      concludedAt: dto.concludedAt || new Date().toISOString(),
      checklist: dto.checklist,
      observations: dto.observations,
    }
    
    // Schedule next maintenance
    if (equipmentItem) {
      const frequencySetting = frequencySettings.find(f => f.equipmentType === equipmentItem.type)
      const frequencyDays = frequencySetting?.frequencyDays ?? 30
      
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + frequencyDays)
      
      const newMaintenance: Maintenance = {
        id: generateId('mnt'),
        equipmentId: maintenance.equipmentId,
        dueDate: dueDate.toISOString(),
        status: 'SCHEDULED',
        createdAt: new Date().toISOString(),
      }
      
      maintenances.push(newMaintenance)
    }
    
    return getMaintenanceWithEquipment(maintenances[index])
  },

  getStats: async (): Promise<DashboardStats> => {
    await delay(200)
    
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const upcoming = maintenances.filter(m => {
      if (m.status !== 'SCHEDULED') return false
      const dueDate = new Date(m.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 3
    }).length

    const overdue = maintenances.filter(m => {
      if (m.status !== 'SCHEDULED') return false
      const dueDate = new Date(m.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate < now
    }).length

    const completedThisMonth = maintenances.filter(m => {
      if (m.status !== 'DONE' || !m.concludedAt) return false
      const concludedDate = new Date(m.concludedAt)
      return concludedDate >= startOfMonth
    }).length

    return { upcoming, overdue, completedThisMonth }
  },

  getChecklist: async (type: EquipmentType): Promise<{ type: string; items: string[] }> => {
    await delay(200)
    
    return {
      type,
      items: mockChecklists[type] || [],
    }
  },
}

export const mockSettingsApi = {
  getFrequencies: async (): Promise<FrequencySetting[]> => {
    await delay(200)
    return [...frequencySettings]
  },

  updateFrequency: async (type: EquipmentType, frequencyDays: number): Promise<FrequencySetting> => {
    await delay(300)
    
    const index = frequencySettings.findIndex(f => f.equipmentType === type)
    if (index === -1) {
      throw new Error('Configuração não encontrada')
    }
    
    frequencySettings[index] = { ...frequencySettings[index], frequencyDays }
    return frequencySettings[index]
  },
}
