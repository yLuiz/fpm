import axios, { type InternalAxiosRequestConfig } from 'axios'
import type {
  AuthResponse,
  AuthTokens,
  LoginCredentials,
  Equipment,
  Maintenance,
  DashboardStats,
  FrequencySetting,
  CreateEquipmentDto,
  CompleteMaintenanceDto,
  CompleteMaintenanceResult,
  CreateDowntimeDto,
  Downtime,
  DowntimeQuery,
  MetricsSummary,
  MonthlyMetric,
  User,
  EquipmentType,
} from '../types'
import { tokenStorage, REFRESH_TOKEN_KEY } from '../lib/token-storage'

// Sem VITE_API_URL, usa o mesmo host da página na porta 3001: assim o sistema
// aberto pelo IP da rede (celular lendo o QR Code) encontra a API.
const API_URL =
  import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3001`

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

let refreshing: Promise<string> | null = null

/**
 * Troca o refresh token por um novo par. Requisições que falham juntas com 401
 * compartilham a mesma renovação, porque cada refresh token só pode ser usado uma vez.
 */
function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = (async () => {
      const current = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!current) throw new Error('Sem refresh token')
      try {
        // axios puro: passar pela instância `api` reentraria neste interceptor
        const { data } = await axios.post<AuthTokens>(`${API_URL}/auth/refresh`, {
          refresh_token: current,
        })
        tokenStorage.save(data)
        return data.access_token
      } catch (error) {
        // Outra aba pode ter renovado primeiro com o mesmo token: aproveita o par novo
        const latest = localStorage.getItem(REFRESH_TOKEN_KEY)
        const access = localStorage.getItem('token')
        if (latest && latest !== current && access) return access
        throw error
      }
    })().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const url = original?.url ?? ''
    // Login e refresh devolvem 401 por credencial/token inválido: não há o que renovar
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/refresh')
    if (error.response?.status !== 401 || isAuthCall || !original) {
      return Promise.reject(error)
    }

    if (!original._retry) {
      original._retry = true
      try {
        const token = await refreshAccessToken()
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      } catch {
        // sessão realmente expirada: segue para o login
      }
    }

    // Volta ao login guardando o destino
    tokenStorage.clear()
    const from = `${window.location.pathname}${window.location.search}`
    window.location.href = `/login?from=${encodeURIComponent(from)}`
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

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
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

  complete: async (id: string, dto: CompleteMaintenanceDto): Promise<CompleteMaintenanceResult> => {
    const { data } = await api.post<CompleteMaintenanceResult>(`/maintenance/${id}/complete`, dto)
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

export const downtimeApi = {
  list: async (query: DowntimeQuery = {}): Promise<Downtime[]> => {
    const { data } = await api.get<Downtime[]>('/downtime', { params: query })
    return data
  },

  create: async (dto: CreateDowntimeDto): Promise<Downtime> => {
    const { data } = await api.post<Downtime>('/downtime', dto)
    return data
  },

  close: async (id: string, endedAt?: string): Promise<Downtime> => {
    const { data } = await api.patch<Downtime>(`/downtime/${id}/close`, { endedAt })
    return data
  },
}

export const metricsApi = {
  summary: async (from?: string, to?: string): Promise<MetricsSummary> => {
    const { data } = await api.get<MetricsSummary>('/metrics/summary', { params: { from, to } })
    return data
  },

  monthly: async (months = 6): Promise<MonthlyMetric[]> => {
    const { data } = await api.get<MonthlyMetric[]>('/metrics/monthly', { params: { months } })
    return data
  },
}
