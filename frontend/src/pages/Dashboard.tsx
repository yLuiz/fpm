import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { equipmentApi, maintenanceApi } from '../services/api'
import type { DashboardStats, Maintenance } from '../types'
import { EQUIPMENT_TYPE_LABELS } from '../types'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function isOverdue(dateString: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(dateString)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [equipmentCount, setEquipmentCount] = useState(0)
  const [upcoming, setUpcoming] = useState<Maintenance[]>([])
  const [overdue, setOverdue] = useState<Maintenance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsData, equipments, upcomingData, overdueData] = await Promise.all([
        maintenanceApi.getStats(),
        equipmentApi.getAll('ACTIVE'),
        maintenanceApi.getUpcoming(3),
        maintenanceApi.getOverdue(),
      ])
      setStats(statsData)
      setEquipmentCount(equipments.length)
      setUpcoming(upcomingData)
      setOverdue(overdueData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <p className="text-sm font-medium text-gray-500">Total Equipamentos</p>
          <p className="text-3xl font-bold text-gray-900">{equipmentCount}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-500">A Vencer (3 dias)</p>
          <p className="text-3xl font-bold text-yellow-600">{stats?.upcoming ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-500">Vencidas</p>
          <p className="text-3xl font-bold text-red-600">{stats?.overdue ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-500">Realizadas (Mês)</p>
          <p className="text-3xl font-bold text-green-600">{stats?.completedThisMonth ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Manutenções Vencidas
          </h2>
          {overdue.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma manutenção vencida</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Equipamento
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Tipo
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Vencimento
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {overdue.map((maintenance) => (
                    <tr key={maintenance.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {maintenance.equipment?.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {EQUIPMENT_TYPE_LABELS[maintenance.equipment?.type ?? 'MOTOR']}
                      </td>
                      <td className="px-4 py-2 text-sm text-red-600 font-medium">
                        {formatDate(maintenance.dueDate)}
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          to={`/maintenance/${maintenance.id}/register`}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          Registrar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Manutenções a Vencer (3 dias)
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma manutenção a vencer</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Equipamento
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Tipo
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Vencimento
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {upcoming.map((maintenance) => (
                    <tr key={maintenance.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {maintenance.equipment?.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {EQUIPMENT_TYPE_LABELS[maintenance.equipment?.type ?? 'MOTOR']}
                      </td>
                      <td className={`px-4 py-2 text-sm font-medium ${
                        isOverdue(maintenance.dueDate) ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {formatDate(maintenance.dueDate)}
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          to={`/maintenance/${maintenance.id}/register`}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          Registrar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
