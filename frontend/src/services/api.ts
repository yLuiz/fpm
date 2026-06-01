import axios from 'axios'
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
  mockAuthApi,
  mockEquipmentApi,
  mockMaintenanceApi,
  mockSettingsApi,
} from '../mocks/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Enable mock mode when backend is unavailable
// Set to true to always use mocks, or false to try real API first
const FORCE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const api = axios.create({
  baseURL: API_URL,
  timeout: 5000, // 5 second timeout
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Helper to determine if we should use mock
let useMock = FORCE_MOCK
let backendChecked = false

async function checkBackendAvailability(): Promise<boolean> {
  if (backendChecked) return !useMock
  
  if (FORCE_MOCK) {
    backendChecked = true
    useMock = true
    console.log('[FPM] Modo mock forçado via VITE_USE_MOCK=true')
    return false
  }
  
  try {
    await api.get('/health', { timeout: 2000 })
    backendChecked = true
    useMock = false
    console.log('[FPM] Backend conectado')
    return true
  } catch {
    backendChecked = true
    useMock = true
    console.log('[FPM] Backend indisponível - usando dados mock')
    return false
  }
}

// Check backend on first load
checkBackendAvailability()

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockAuthApi.login(credentials)
    }
    
    const { data } = await api.post<AuthResponse>('/auth/login', credentials)
    return data
  },

  me: async (): Promise<User> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockAuthApi.me()
    }
    
    const { data } = await api.get<User>('/auth/me')
    return data
  },
}

export const equipmentApi = {
  getAll: async (status?: string): Promise<Equipment[]> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockEquipmentApi.getAll(status)
    }
    
    const params = status ? { status } : {}
    const { data } = await api.get<Equipment[]>('/equipment', { params })
    return data
  },

  getById: async (id: string): Promise<Equipment> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockEquipmentApi.getById(id)
    }
    
    const { data } = await api.get<Equipment>(`/equipment/${id}`)
    return data
  },

  create: async (equipment: CreateEquipmentDto): Promise<Equipment> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockEquipmentApi.create(equipment)
    }
    
    const { data } = await api.post<Equipment>('/equipment', equipment)
    return data
  },

  update: async (id: string, equipment: Partial<CreateEquipmentDto>): Promise<Equipment> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockEquipmentApi.update(id, equipment)
    }
    
    const { data } = await api.patch<Equipment>(`/equipment/${id}`, equipment)
    return data
  },

  toggleStatus: async (id: string): Promise<Equipment> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockEquipmentApi.toggleStatus(id)
    }
    
    const { data } = await api.patch<Equipment>(`/equipment/${id}/toggle-status`)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockEquipmentApi.delete(id)
    }
    
    await api.delete(`/equipment/${id}`)
  },
}

export const maintenanceApi = {
  getUpcoming: async (days: number = 3): Promise<Maintenance[]> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockMaintenanceApi.getUpcoming(days)
    }
    
    const { data } = await api.get<Maintenance[]>('/maintenance/upcoming', {
      params: { days },
    })
    return data
  },

  getOverdue: async (): Promise<Maintenance[]> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockMaintenanceApi.getOverdue()
    }
    
    const { data } = await api.get<Maintenance[]>('/maintenance/overdue')
    return data
  },

  getByEquipment: async (equipmentId: string): Promise<Maintenance[]> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockMaintenanceApi.getByEquipment(equipmentId)
    }
    
    const { data } = await api.get<Maintenance[]>(`/maintenance/by-equipment/${equipmentId}`)
    return data
  },

  getById: async (id: string): Promise<Maintenance> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockMaintenanceApi.getById(id)
    }
    
    const { data } = await api.get<Maintenance>(`/maintenance/${id}`)
    return data
  },

  complete: async (id: string, dto: CompleteMaintenanceDto): Promise<Maintenance> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockMaintenanceApi.complete(id, dto)
    }
    
    const { data } = await api.post<Maintenance>(`/maintenance/${id}/complete`, dto)
    return data
  },

  getStats: async (): Promise<DashboardStats> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockMaintenanceApi.getStats()
    }
    
    const { data } = await api.get<DashboardStats>('/maintenance/stats')
    return data
  },

  getChecklist: async (type: EquipmentType): Promise<{ type: string; items: string[] }> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockMaintenanceApi.getChecklist(type)
    }
    
    const { data } = await api.get<{ type: string; items: string[] }>(`/maintenance/checklist/${type}`)
    return data
  },
}

export const settingsApi = {
  getFrequencies: async (): Promise<FrequencySetting[]> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockSettingsApi.getFrequencies()
    }
    
    const { data } = await api.get<FrequencySetting[]>('/settings/frequency')
    return data
  },

  updateFrequency: async (type: EquipmentType, frequencyDays: number): Promise<FrequencySetting> => {
    await checkBackendAvailability()
    
    if (useMock) {
      return mockSettingsApi.updateFrequency(type, frequencyDays)
    }
    
    const { data } = await api.put<FrequencySetting>(`/settings/frequency/${type}`, {
      frequencyDays,
    })
    return data
  },
}

export default api
