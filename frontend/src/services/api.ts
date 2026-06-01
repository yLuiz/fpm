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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_URL,
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

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials)
    return data
  },

  me: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me')
    return data
  },
}

export const equipmentApi = {
  getAll: async (status?: string): Promise<Equipment[]> => {
    const params = status ? { status } : {}
    const { data } = await api.get<Equipment[]>('/equipment', { params })
    return data
  },

  getById: async (id: string): Promise<Equipment> => {
    const { data } = await api.get<Equipment>(`/equipment/${id}`)
    return data
  },

  create: async (equipment: CreateEquipmentDto): Promise<Equipment> => {
    const { data } = await api.post<Equipment>('/equipment', equipment)
    return data
  },

  update: async (id: string, equipment: Partial<CreateEquipmentDto>): Promise<Equipment> => {
    const { data } = await api.patch<Equipment>(`/equipment/${id}`, equipment)
    return data
  },

  toggleStatus: async (id: string): Promise<Equipment> => {
    const { data } = await api.patch<Equipment>(`/equipment/${id}/toggle-status`)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/equipment/${id}`)
  },
}

export const maintenanceApi = {
  getUpcoming: async (days: number = 3): Promise<Maintenance[]> => {
    const { data } = await api.get<Maintenance[]>('/maintenance/upcoming', {
      params: { days },
    })
    return data
  },

  getOverdue: async (): Promise<Maintenance[]> => {
    const { data } = await api.get<Maintenance[]>('/maintenance/overdue')
    return data
  },

  getByEquipment: async (equipmentId: string): Promise<Maintenance[]> => {
    const { data } = await api.get<Maintenance[]>(`/maintenance/by-equipment/${equipmentId}`)
    return data
  },

  getById: async (id: string): Promise<Maintenance> => {
    const { data } = await api.get<Maintenance>(`/maintenance/${id}`)
    return data
  },

  complete: async (id: string, dto: CompleteMaintenanceDto): Promise<Maintenance> => {
    const { data } = await api.post<Maintenance>(`/maintenance/${id}/complete`, dto)
    return data
  },

  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get<DashboardStats>('/maintenance/stats')
    return data
  },

  getChecklist: async (type: EquipmentType): Promise<{ type: string; items: string[] }> => {
    const { data } = await api.get<{ type: string; items: string[] }>(`/maintenance/checklist/${type}`)
    return data
  },
}

export const settingsApi = {
  getFrequencies: async (): Promise<FrequencySetting[]> => {
    const { data } = await api.get<FrequencySetting[]>('/settings/frequency')
    return data
  },

  updateFrequency: async (type: EquipmentType, frequencyDays: number): Promise<FrequencySetting> => {
    const { data } = await api.put<FrequencySetting>(`/settings/frequency/${type}`, {
      frequencyDays,
    })
    return data
  },
}

export default api
