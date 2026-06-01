import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { equipmentApi, maintenanceApi } from '../services/api'
import type { DashboardStats, Maintenance } from '../types'
import { EQUIPMENT_TYPE_LABELS } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'

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

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-8 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visao geral do sistema de manutencao preventiva</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <TableSkeleton />
          <TableSkeleton />
        </div>
      </div>
    )
  }

  const statsCards = [
    {
      title: 'Total Equipamentos',
      value: equipmentCount,
      description: 'equipamentos ativos',
      icon: Wrench,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'A Vencer',
      value: stats?.upcoming ?? 0,
      description: 'proximos 3 dias',
      icon: Clock,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    {
      title: 'Vencidas',
      value: stats?.overdue ?? 0,
      description: 'precisam atencao',
      icon: AlertTriangle,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
    {
      title: 'Realizadas',
      value: stats?.completedThisMonth ?? 0,
      description: 'este mes',
      icon: CheckCircle,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visao geral do sistema de manutencao preventiva</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`rounded-full p-2 ${card.iconBg}`}>
                <card.icon className={`size-4 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Overdue Maintenances */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-destructive" />
                  Manutencoes Vencidas
                </CardTitle>
                <CardDescription>Requerem atencao imediata</CardDescription>
              </div>
              {overdue.length > 0 && (
                <Badge variant="destructive">{overdue.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {overdue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="size-12 text-emerald-500/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma manutencao vencida</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdue.slice(0, 5).map((maintenance) => (
                    <TableRow key={maintenance.id}>
                      <TableCell className="font-medium">
                        {maintenance.equipment?.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {EQUIPMENT_TYPE_LABELS[maintenance.equipment?.type ?? 'MOTOR']}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="font-normal">
                          {formatDate(maintenance.dueDate)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/maintenance/${maintenance.id}/register`}>
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Maintenances */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-4 text-amber-500" />
                  A Vencer em 3 dias
                </CardTitle>
                <CardDescription>Proximas manutencoes programadas</CardDescription>
              </div>
              {upcoming.length > 0 && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">
                  {upcoming.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="size-12 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma manutencao a vencer</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.slice(0, 5).map((maintenance) => (
                    <TableRow key={maintenance.id}>
                      <TableCell className="font-medium">
                        {maintenance.equipment?.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {EQUIPMENT_TYPE_LABELS[maintenance.equipment?.type ?? 'MOTOR']}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={isOverdue(maintenance.dueDate) ? 'destructive' : 'secondary'}
                          className={!isOverdue(maintenance.dueDate) ? 'bg-amber-500/10 text-amber-600' : ''}
                        >
                          {formatDate(maintenance.dueDate)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/maintenance/${maintenance.id}/register`}>
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
