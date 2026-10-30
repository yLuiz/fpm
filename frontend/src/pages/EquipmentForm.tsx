import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { equipmentApi } from '../services/api'
import type { EquipmentType, Criticality, CreateEquipmentDto } from '../types'
import { EQUIPMENT_TYPE_LABELS, CRITICALITY_LABELS } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/page-header'

export default function EquipmentForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<CreateEquipmentDto>({
    name: '',
    type: 'MOTOR',
    location: '',
    criticality: 'MEDIUM',
  })

  useEffect(() => {
    if (isEditing) loadEquipment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.error('Erro ao carregar equipamento')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEditing) {
        await equipmentApi.update(id!, formData)
        toast.success('Equipamento atualizado')
      } else {
        await equipmentApi.create(formData)
        toast.success('Equipamento criado')
      }
      navigate('/equipment')
    } catch (error) {
      console.error('Error saving equipment:', error)
      toast.error('Erro ao salvar equipamento')
    } finally {
      setSaving(false)
    }
  }

  const update = <K extends keyof CreateEquipmentDto>(key: K, value: CreateEquipmentDto[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }))

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 max-w-2xl" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        back={{ to: '/equipment', label: 'Voltar para lista' }}
        title={isEditing ? 'Editar equipamento' : 'Novo equipamento'}
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do equipamento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do equipamento *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Ex: Motor Principal Linha 1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select value={formData.type} onValueChange={(v) => update('type', v as EquipmentType)}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(EQUIPMENT_TYPE_LABELS) as EquipmentType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {EQUIPMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Localização *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => update('location', e.target.value)}
                placeholder="Ex: Galpão A - Setor 1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="criticality">Criticidade *</Label>
              <Select
                value={formData.criticality}
                onValueChange={(v) => update('criticality', v as Criticality)}
              >
                <SelectTrigger id="criticality" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CRITICALITY_LABELS) as Criticality[]).map((level) => (
                    <SelectItem key={level} value={level}>
                      {CRITICALITY_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                {isEditing ? 'Salvar alterações' : 'Criar equipamento'}
              </Button>
              <Button asChild variant="outline" type="button">
                <Link to="/equipment">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
