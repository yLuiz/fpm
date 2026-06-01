import { useEffect, useState } from 'react'
import { settingsApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import type { FrequencySetting, EquipmentType } from '../types'
import { EQUIPMENT_TYPE_LABELS } from '../types'

export default function Settings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [frequencies, setFrequencies] = useState<FrequencySetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, number>>({})

  useEffect(() => {
    loadFrequencies()
  }, [])

  const loadFrequencies = async () => {
    try {
      const data = await settingsApi.getFrequencies()
      setFrequencies(data)
      const values: Record<string, number> = {}
      data.forEach((f) => {
        values[f.equipmentType] = f.frequencyDays
      })
      setEditValues(values)
    } catch (error) {
      console.error('Error loading frequencies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (type: string, value: number) => {
    setEditValues((prev) => ({ ...prev, [type]: value }))
  }

  const handleSave = async (type: EquipmentType) => {
    const newValue = editValues[type]
    if (newValue < 1 || newValue > 365) {
      return
    }

    setSaving(type)
    try {
      await settingsApi.updateFrequency(type, newValue)
      await loadFrequencies()
    } catch (error) {
      console.error('Error updating frequency:', error)
    } finally {
      setSaving(null)
    }
  }

  const hasChanged = (type: string) => {
    const original = frequencies.find((f) => f.equipmentType === type)
    return original && editValues[type] !== original.frequencyDays
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configurações</h1>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Frequência de Manutenção por Tipo
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Configure a frequência em dias para cada tipo de equipamento.
          As novas frequências serão aplicadas às próximas manutenções criadas.
        </p>

        {!isAdmin && (
          <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg text-sm mb-6">
            Somente administradores podem alterar as configurações.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo de Equipamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequência (dias)
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ação
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {frequencies.map((freq) => (
                <tr key={freq.equipmentType}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {EQUIPMENT_TYPE_LABELS[freq.equipmentType]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isAdmin ? (
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={editValues[freq.equipmentType] || freq.frequencyDays}
                        onChange={(e) =>
                          handleChange(freq.equipmentType, parseInt(e.target.value) || 1)
                        }
                        className="input-field w-24"
                      />
                    ) : (
                      <span className="text-sm text-gray-900">{freq.frequencyDays} dias</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleSave(freq.equipmentType)}
                        disabled={!hasChanged(freq.equipmentType) || saving === freq.equipmentType}
                        className={`text-sm font-medium ${
                          hasChanged(freq.equipmentType)
                            ? 'text-primary-600 hover:text-primary-800'
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {saving === freq.equipmentType ? 'Salvando...' : 'Salvar'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
