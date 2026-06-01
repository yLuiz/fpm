import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { maintenanceApi } from '../services/api'
import type { Maintenance, CompleteMaintenanceDto } from '../types'
import { EQUIPMENT_TYPE_LABELS } from '../types'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function formatDateTimeLocal(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function MaintenanceRegister() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [maintenance, setMaintenance] = useState<Maintenance | null>(null)
  const [checklistItems, setChecklistItems] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [concludedAt, setConcludedAt] = useState(formatDateTimeLocal(new Date()))
  const [observations, setObservations] = useState('')

  useEffect(() => {
    if (id) {
      loadMaintenance()
    }
  }, [id])

  const loadMaintenance = async () => {
    try {
      const maintenanceData = await maintenanceApi.getById(id!)
      setMaintenance(maintenanceData)

      if (maintenanceData.equipment) {
        const checklistData = await maintenanceApi.getChecklist(maintenanceData.equipment.type)
        setChecklistItems(checklistData.items)
      }
    } catch (error) {
      console.error('Error loading maintenance:', error)
      setError('Erro ao carregar manutenção')
    } finally {
      setLoading(false)
    }
  }

  const handleChecklistChange = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    )
  }

  const handleSelectAll = () => {
    if (selectedItems.length === checklistItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems([...checklistItems])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (selectedItems.length === 0) {
      setError('Selecione pelo menos um item do checklist')
      return
    }

    setSaving(true)

    try {
      const dto: CompleteMaintenanceDto = {
        concludedAt: new Date(concludedAt).toISOString(),
        checklist: selectedItems,
        observations: observations || undefined,
      }

      await maintenanceApi.complete(id!, dto)
      navigate(`/equipment/${maintenance?.equipmentId}`)
    } catch (error) {
      console.error('Error completing maintenance:', error)
      setError('Erro ao registrar manutenção')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!maintenance) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Manutenção não encontrada</p>
        <Link to="/" className="text-primary-600 hover:text-primary-800 mt-2 inline-block">
          Voltar para Dashboard
        </Link>
      </div>
    )
  }

  if (maintenance.status === 'DONE') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Esta manutenção já foi concluída</p>
        <Link
          to={`/equipment/${maintenance.equipmentId}`}
          className="text-primary-600 hover:text-primary-800 mt-2 inline-block"
        >
          Ver equipamento
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to={`/equipment/${maintenance.equipmentId}`}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          &larr; Voltar para equipamento
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Registrar Manutenção</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Equipamento</dt>
              <dd className="text-sm text-gray-900">{maintenance.equipment?.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tipo</dt>
              <dd className="text-sm text-gray-900">
                {EQUIPMENT_TYPE_LABELS[maintenance.equipment?.type ?? 'MOTOR']}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Local</dt>
              <dd className="text-sm text-gray-900">{maintenance.equipment?.location}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Data Prevista</dt>
              <dd className="text-sm text-gray-900">{formatDate(maintenance.dueDate)}</dd>
            </div>
          </dl>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Registro de Manutenção</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Checklist *
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  {selectedItems.length === checklistItems.length
                    ? 'Desmarcar todos'
                    : 'Marcar todos'}
                </button>
              </div>
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                {checklistItems.map((item) => (
                  <label key={item} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item)}
                      onChange={() => handleChecklistChange(item)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {selectedItems.length} de {checklistItems.length} itens selecionados
              </p>
            </div>

            <div>
              <label
                htmlFor="concludedAt"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Data/Hora da Conclusão
              </label>
              <input
                id="concludedAt"
                type="datetime-local"
                value={concludedAt}
                onChange={(e) => setConcludedAt(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label
                htmlFor="observations"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Observações
              </label>
              <textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="input-field min-h-[100px]"
                placeholder="Observações adicionais sobre a manutenção..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Registrando...' : 'Registrar Manutenção'}
              </button>
              <Link to={`/equipment/${maintenance.equipmentId}`} className="btn-secondary">
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
