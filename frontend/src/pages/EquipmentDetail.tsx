import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { equipmentApi } from '../services/api'
import type { Equipment } from '../types'
import {
  EQUIPMENT_TYPE_LABELS,
  CRITICALITY_LABELS,
  STATUS_LABELS,
  MAINTENANCE_STATUS_LABELS,
} from '../types'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('pt-BR')
}

function isOverdue(dateString: string, status: string) {
  if (status === 'DONE') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(dateString)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

function getMaintenanceStatus(dueDate: string, status: string) {
  if (status === 'DONE') return 'DONE'
  return isOverdue(dueDate, status) ? 'OVERDUE' : 'SCHEDULED'
}

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>()
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadEquipment()
    }
  }, [id])

  const loadEquipment = async () => {
    try {
      const data = await equipmentApi.getById(id!)
      setEquipment(data)
    } catch (error) {
      console.error('Error loading equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCriticalityClass = (criticality: string) => {
    switch (criticality) {
      case 'HIGH':
        return 'badge-high'
      case 'MEDIUM':
        return 'badge-medium'
      case 'LOW':
        return 'badge-low'
      default:
        return ''
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'badge-done'
      case 'OVERDUE':
        return 'badge-overdue'
      case 'SCHEDULED':
        return 'badge-scheduled'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Equipamento não encontrado</p>
        <Link to="/equipment" className="text-primary-600 hover:text-primary-800 mt-2 inline-block">
          Voltar para lista
        </Link>
      </div>
    )
  }

  const nextMaintenance = equipment.maintenances?.find((m) => m.status === 'SCHEDULED')

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/equipment" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            &larr; Voltar para lista
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{equipment.name}</h1>
        </div>
        <div className="flex gap-3">
          <Link to={`/equipment/${equipment.id}/edit`} className="btn-secondary">
            Editar
          </Link>
          {nextMaintenance && (
            <Link
              to={`/maintenance/${nextMaintenance.id}/register`}
              className="btn-primary"
            >
              Registrar Manutenção
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Tipo</dt>
              <dd className="text-sm text-gray-900">{EQUIPMENT_TYPE_LABELS[equipment.type]}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Localização</dt>
              <dd className="text-sm text-gray-900">{equipment.location}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Criticidade</dt>
              <dd>
                <span className={`badge ${getCriticalityClass(equipment.criticality)}`}>
                  {CRITICALITY_LABELS[equipment.criticality]}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd>
                <span
                  className={`badge ${
                    equipment.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {STATUS_LABELS[equipment.status]}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Cadastrado em</dt>
              <dd className="text-sm text-gray-900">{formatDate(equipment.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Próxima Manutenção</h2>
          {nextMaintenance ? (
            <div>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {formatDate(nextMaintenance.dueDate)}
              </p>
              <span
                className={`badge ${getStatusClass(
                  getMaintenanceStatus(nextMaintenance.dueDate, nextMaintenance.status)
                )}`}
              >
                {
                  MAINTENANCE_STATUS_LABELS[
                    getMaintenanceStatus(nextMaintenance.dueDate, nextMaintenance.status)
                  ]
                }
              </span>
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma manutenção agendada</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Manutenções</h2>
        {!equipment.maintenances || equipment.maintenances.length === 0 ? (
          <p className="text-gray-500">Nenhuma manutenção registrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Prevista
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Conclusão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Observações
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {equipment.maintenances.map((maintenance) => {
                  const displayStatus = getMaintenanceStatus(maintenance.dueDate, maintenance.status)
                  return (
                    <tr key={maintenance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(maintenance.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {maintenance.concludedAt
                          ? formatDateTime(maintenance.concludedAt)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getStatusClass(displayStatus)}`}>
                          {MAINTENANCE_STATUS_LABELS[displayStatus]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {maintenance.observations || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {maintenance.status === 'SCHEDULED' ? (
                          <Link
                            to={`/maintenance/${maintenance.id}/register`}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            Registrar
                          </Link>
                        ) : (
                          <span className="text-gray-400">Concluída</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
