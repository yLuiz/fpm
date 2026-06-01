import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { equipmentApi } from '../services/api'
import type { EquipmentType, Criticality, CreateEquipmentDto } from '../types'
import { EQUIPMENT_TYPE_LABELS, CRITICALITY_LABELS } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, AlertCircle, Loader2, Save, Wrench } from 'lucide-react'

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

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

  if (loading) {
    return <FormSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link to="/equipment">
              <ArrowLeft data-icon="inline-start" />
              Equipamentos
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
        </h1>
      </div>

      {/* Form Card */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="size-5" />
            {isEditing ? 'Editar Dados' : 'Dados do Equipamento'}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? 'Atualize as informacoes do equipamento'
              : 'Preencha os dados para cadastrar um novo equipamento'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium leading-none">
                Nome do Equipamento *
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Motor Principal Linha 1"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium leading-none">
                Tipo *
              </label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as EquipmentType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
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
              <label htmlFor="location" className="text-sm font-medium leading-none">
                Localizacao *
              </label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Ex: Galpao A - Setor 1"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="criticality" className="text-sm font-medium leading-none">
                Criticidade *
              </label>
              <Select
                value={formData.criticality}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, criticality: value as Criticality }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a criticidade" />
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

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save data-icon="inline-start" />
                    {isEditing ? 'Salvar Alteracoes' : 'Criar Equipamento'}
                  </>
                )}
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link to="/equipment">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
