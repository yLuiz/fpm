import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { equipmentApi } from '../services/api'
import type { EquipmentType, Criticality, CreateEquipmentDto } from '../types'
import { EQUIPMENT_TYPE_LABELS, CRITICALITY_LABELS } from '../types'

export default function EquipmentForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<CreateEquipmentDto>({
    name: '',
    type: 'MOTOR',
    location: '',
    criticality: 'MEDIUM',
  })

  useEffect(() => {
    if (isEditing) {
      loadEquipment()
    }
  }, [id])

  const loadEquipment = async () => {
    setLoading(true)
    try {
      const equipment = await equipmentApi.getById(id!)
      setFormData({
        name: equipment.name,
        type: equipment.type,
        location: equipment.location,
        criticality: equipment.criticality,
      })
    } catch (error) {
      console.error('Error loading equipment:', error)
      setError('Erro ao carregar equipamento')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (isEditing) {
        await equipmentApi.update(id!, formData)
      } else {
        await equipmentApi.create(formData)
      }
      navigate('/equipment')
    } catch (error) {
      console.error('Error saving equipment:', error)
      setError('Erro ao salvar equipamento')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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
      <div className="mb-6">
        <Link
          to="/equipment"
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          &larr; Voltar para lista
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
        </h1>
      </div>

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Equipamento *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="input-field"
              placeholder="Ex: Motor Principal Linha 1"
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo *
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="input-field"
              required
            >
              {(Object.keys(EQUIPMENT_TYPE_LABELS) as EquipmentType[]).map((type) => (
                <option key={type} value={type}>
                  {EQUIPMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Localização *
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              className="input-field"
              placeholder="Ex: Galpão A - Setor 1"
              required
            />
          </div>

          <div>
            <label htmlFor="criticality" className="block text-sm font-medium text-gray-700 mb-1">
              Criticidade *
            </label>
            <select
              id="criticality"
              name="criticality"
              value={formData.criticality}
              onChange={handleChange}
              className="input-field"
              required
            >
              {(Object.keys(CRITICALITY_LABELS) as Criticality[]).map((level) => (
                <option key={level} value={level}>
                  {CRITICALITY_LABELS[level]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Equipamento'}
            </button>
            <Link to="/equipment" className="btn-secondary">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
