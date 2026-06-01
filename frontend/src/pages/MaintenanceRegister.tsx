import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { maintenanceApi } from '../services/api'
import type { Maintenance, CompleteMaintenanceDto } from '../types'
import { EQUIPMENT_TYPE_LABELS } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle,
  Wrench,
  MapPin,
  Calendar,
  ClipboardList,
} from 'lucide-react'

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

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
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
      setError('Erro ao carregar manutencao')
    } finally {
      setLoading(false)
    }
  }

  const handleChecklistChange = (item: string, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, item])
    } else {
      setSelectedItems((prev) => prev.filter((i) => i !== item))
    }
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
      setError('Erro ao registrar manutencao')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <FormSkeleton />
  }

  if (!maintenance) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ClipboardList className="size-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">Manutencao nao encontrada</p>
        <Button variant="outline" asChild>
          <Link to="/">
            <ArrowLeft data-icon="inline-start" />
            Voltar para Dashboard
          </Link>
        </Button>
      </div>
    )
  }

  if (maintenance.status === 'DONE') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle className="size-12 text-emerald-500/50 mb-4" />
        <p className="text-muted-foreground mb-4">Esta manutencao ja foi concluida</p>
        <Button variant="outline" asChild>
          <Link to={`/equipment/${maintenance.equipmentId}`}>
            <ArrowLeft data-icon="inline-start" />
            Ver equipamento
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link to={`/equipment/${maintenance.equipmentId}`}>
              <ArrowLeft data-icon="inline-start" />
              Voltar para equipamento
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Registrar Manutencao</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Equipment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-4" />
              Informacoes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Equipamento</p>
              <p className="font-medium">{maintenance.equipment?.name}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tipo</p>
              <p className="font-medium">
                {EQUIPMENT_TYPE_LABELS[maintenance.equipment?.type ?? 'MOTOR']}
              </p>
            </div>
            <Separator />
            <div className="flex items-start gap-2">
              <MapPin className="size-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Local</p>
                <p className="font-medium">{maintenance.equipment?.location}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-2">
              <Calendar className="size-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data Prevista</p>
                <p className="font-medium">{formatDate(maintenance.dueDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4" />
              Registro de Manutencao
            </CardTitle>
            <CardDescription>
              Preencha o checklist e as informacoes da manutencao realizada
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

              {/* Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Checklist *</label>
                  <Button type="button" variant="ghost" size="sm" onClick={handleSelectAll}>
                    {selectedItems.length === checklistItems.length
                      ? 'Desmarcar todos'
                      : 'Marcar todos'}
                  </Button>
                </div>
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  {checklistItems.map((item) => (
                    <div key={item} className="flex items-center space-x-3">
                      <Checkbox
                        id={item}
                        checked={selectedItems.includes(item)}
                        onCheckedChange={(checked) => handleChecklistChange(item, checked as boolean)}
                      />
                      <label
                        htmlFor={item}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {item}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedItems.length} de {checklistItems.length} itens selecionados
                </p>
              </div>

              {/* Date/Time */}
              <div className="space-y-2">
                <label htmlFor="concludedAt" className="text-sm font-medium">
                  Data/Hora da Conclusao
                </label>
                <Input
                  id="concludedAt"
                  type="datetime-local"
                  value={concludedAt}
                  onChange={(e) => setConcludedAt(e.target.value)}
                />
              </div>

              {/* Observations */}
              <div className="space-y-2">
                <label htmlFor="observations" className="text-sm font-medium">
                  Observacoes
                </label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Observacoes adicionais sobre a manutencao..."
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle data-icon="inline-start" />
                      Registrar Manutencao
                    </>
                  )}
                </Button>
                <Button variant="outline" type="button" asChild>
                  <Link to={`/equipment/${maintenance.equipmentId}`}>Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
