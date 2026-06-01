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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Pencil,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
} from 'lucide-react'

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

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
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

  const getCriticalityVariant = (criticality: string) => {
    switch (criticality) {
      case 'HIGH':
        return 'destructive'
      case 'MEDIUM':
        return 'secondary'
      case 'LOW':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'default'
      case 'OVERDUE':
        return 'destructive'
      case 'SCHEDULED':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return <DetailSkeleton />
  }

  if (!equipment) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Wrench className="size-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">Equipamento nao encontrado</p>
        <Button variant="outline" asChild>
          <Link to="/equipment">
            <ArrowLeft data-icon="inline-start" />
            Voltar para lista
          </Link>
        </Button>
      </div>
    )
  }

  const nextMaintenance = equipment.maintenances?.find((m) => m.status === 'SCHEDULED')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" className="-ml-2" asChild>
              <Link to="/equipment">
                <ArrowLeft data-icon="inline-start" />
                Equipamentos
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{equipment.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/equipment/${equipment.id}/edit`}>
              <Pencil data-icon="inline-start" />
              Editar
            </Link>
          </Button>
          {nextMaintenance && (
            <Button asChild>
              <Link to={`/maintenance/${nextMaintenance.id}/register`}>
                <CheckCircle data-icon="inline-start" />
                Registrar Manutencao
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informacoes do Equipamento</CardTitle>
            <CardDescription>Dados cadastrais e especificacoes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="rounded-full p-2 bg-muted">
                  <Wrench className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                  <p className="font-medium">{EQUIPMENT_TYPE_LABELS[equipment.type]}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full p-2 bg-muted">
                  <MapPin className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Localizacao</p>
                  <p className="font-medium">{equipment.location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full p-2 bg-muted">
                  <AlertTriangle className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Criticidade</p>
                  <Badge variant={getCriticalityVariant(equipment.criticality) as "destructive" | "secondary" | "outline"} className="mt-1">
                    {CRITICALITY_LABELS[equipment.criticality]}
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full p-2 bg-muted">
                  <CheckCircle className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={equipment.status === 'ACTIVE' ? 'default' : 'secondary'} className="mt-1">
                    {STATUS_LABELS[equipment.status]}
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full p-2 bg-muted">
                  <Calendar className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cadastrado em</p>
                  <p className="font-medium">{formatDate(equipment.createdAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4" />
              Proxima Manutencao
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextMaintenance ? (
              <div className="space-y-3">
                <p className="text-3xl font-bold">{formatDate(nextMaintenance.dueDate)}</p>
                <Badge variant={getStatusVariant(getMaintenanceStatus(nextMaintenance.dueDate, nextMaintenance.status)) as "default" | "destructive" | "secondary"}>
                  {MAINTENANCE_STATUS_LABELS[getMaintenanceStatus(nextMaintenance.dueDate, nextMaintenance.status)]}
                </Badge>
              </div>
            ) : (
              <div className="text-center py-4">
                <Clock className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma manutencao agendada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Maintenance History */}
      <Card>
        <CardHeader>
          <CardTitle>Historico de Manutencoes</CardTitle>
          <CardDescription>Registro de todas as manutencoes do equipamento</CardDescription>
        </CardHeader>
        <CardContent>
          {!equipment.maintenances || equipment.maintenances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="size-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma manutencao registrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Prevista</TableHead>
                  <TableHead>Data Conclusao</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observacoes</TableHead>
                  <TableHead className="w-[100px]">Acao</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.maintenances.map((maintenance) => {
                  const displayStatus = getMaintenanceStatus(maintenance.dueDate, maintenance.status)
                  return (
                    <TableRow key={maintenance.id}>
                      <TableCell className="font-medium">
                        {formatDate(maintenance.dueDate)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {maintenance.concludedAt ? formatDateTime(maintenance.concludedAt) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(displayStatus) as "default" | "destructive" | "secondary"}>
                          {MAINTENANCE_STATUS_LABELS[displayStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {maintenance.observations || '-'}
                      </TableCell>
                      <TableCell>
                        {maintenance.status === 'SCHEDULED' ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/maintenance/${maintenance.id}/register`}>
                              Registrar
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">Concluida</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
