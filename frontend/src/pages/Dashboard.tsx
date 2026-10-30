import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Cog, CalendarClock, AlertTriangle, CheckCircle2, Wrench, Activity, TrendingUp } from 'lucide-react'
import { Pie, PieChart, Cell, Bar, BarChart, CartesianGrid, XAxis, LabelList } from 'recharts'
import { downtimeApi, equipmentApi, maintenanceApi } from '../services/api'
import type { DashboardStats, Downtime, Equipment, Maintenance, EquipmentType } from '../types'
import { MAINTENANCE_KIND_LABELS } from '../types'
import { formatDate, formatDuration, isOverdue, minutesBetween } from '@/lib/format'
import { chartColors } from '@/lib/chart-colors'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { ChartLegend } from '@/components/chart-legend'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IndicatorsTab } from '@/components/dashboard/indicators-tab'

const SHORT_TYPE_LABELS: Record<EquipmentType, string> = {
  MOTOR: 'Motores',
  COMPRESSOR: 'Compressores',
  PUMP: 'Bombas',
  CONVEYOR: 'Esteiras',
  PANEL: 'Painéis',
}

const statusConfig = {
  upcoming: { label: 'A vencer', color: chartColors.upcoming },
  overdue: { label: 'Vencidas', color: chartColors.overdue },
  done: { label: 'Realizadas', color: chartColors.done },
} satisfies ChartConfig

const typeConfig = {
  count: { label: 'Equipamentos', color: chartColors.equipmentCount },
} satisfies ChartConfig

interface StatCardProps {
  label: string
  value: number
  icon: React.ElementType
  /** Classe de cor do valor (cor semântica de status) */
  tone: string
}

function StatCard({ label, value, icon: Icon, tone }: StatCardProps) {
  return (
    <Card className="gap-2">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-sm">{label}</CardTitle>
        <Icon className={cn('size-5', tone)} />
      </CardHeader>
      <CardContent>
        <p className={cn('text-4xl leading-none font-bold tabular-nums', tone)}>{value}</p>
      </CardContent>
    </Card>
  )
}

function MaintenanceTable({ data, emptyLabel }: { data: Maintenance[]; emptyLabel: string }) {
  if (data.length === 0) {
    return <EmptyState title="Sem dados" description={emptyLabel} />
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Equipamento</TableHead>
          <TableHead>Manutenção</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead>Ação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((m) => (
          <TableRow key={m.id}>
            <TableCell>{m.equipment?.name}</TableCell>
            <TableCell>
              <Badge variant={m.kind === 'CORRECTIVE' ? 'destructive' : 'outline'}>
                {MAINTENANCE_KIND_LABELS[m.kind]}
              </Badge>
            </TableCell>
            <TableCell
              className={cn(
                'font-semibold',
                isOverdue(m.dueDate) ? 'text-danger-text' : 'text-warning-text'
              )}
            >
              {formatDate(m.dueDate)}
            </TableCell>
            <TableCell>
              <Button asChild variant="details" size="sm">
                <Link to={`/maintenance/${m.id}/register`}>
                  <Wrench />
                  Registrar
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Aba Operação: situação atual (pendências, paradas, distribuição). */
function OperationTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [upcoming, setUpcoming] = useState<Maintenance[]>([])
  const [overdue, setOverdue] = useState<Maintenance[]>([])
  const [downNow, setDownNow] = useState<Downtime[]>([])
  const [loading, setLoading] = useState(true)
  const [hiddenStatus, setHiddenStatus] = useState<string[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, equipments, upcomingData, overdueData, openDowntimes] = await Promise.all([
          maintenanceApi.getStats(),
          equipmentApi.getAll('ACTIVE'),
          maintenanceApi.getUpcoming(3),
          maintenanceApi.getOverdue(),
          downtimeApi.list({ open: true }),
        ])
        setDownNow(openDowntimes)
        setStats(statsData)
        setEquipment(equipments)
        setUpcoming(upcomingData)
        setOverdue(overdueData)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </>
    )
  }

  const statusData = [
    { key: 'upcoming', name: 'A vencer', value: stats?.upcoming ?? 0, fill: chartColors.upcoming },
    { key: 'overdue', name: 'Vencidas', value: stats?.overdue ?? 0, fill: chartColors.overdue },
    { key: 'done', name: 'Realizadas', value: stats?.completedThisMonth ?? 0, fill: chartColors.done },
  ]
  const visibleStatus = statusData.filter((d) => !hiddenStatus.includes(d.key))

  const toggleStatus = (key: string) =>
    setHiddenStatus((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

  const typeData = (Object.keys(SHORT_TYPE_LABELS) as EquipmentType[]).map((type) => ({
    type: SHORT_TYPE_LABELS[type],
    count: equipment.filter((e) => e.type === type).length,
  }))

  return (
    <>
      {downNow.length > 0 && (
        <Card className="gap-2 border-danger py-3 hover:border-danger">
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-2 font-semibold text-danger-text">
              <span className="size-3 animate-blink rounded-full bg-danger-text" />
              {downNow.length} equipamento(s) parado(s)
            </span>
            {downNow.map((d) => (
              <Link
                key={d.id}
                to={`/equipment/${d.equipmentId}`}
                className="text-sm transition-colors duration-300 hover:text-accent-solid"
              >
                {d.equipment?.name}{' '}
                <span className="font-normal text-label">
                  há {formatDuration(minutesBetween(d.startedAt, null))}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total de equipamentos" value={equipment.length} icon={Cog} tone="text-foreground" />
        <StatCard
          label="A vencer (3 dias)"
          value={stats?.upcoming ?? 0}
          icon={CalendarClock}
          tone="text-warning-text"
        />
        <StatCard
          label="Vencidas"
          value={stats?.overdue ?? 0}
          icon={AlertTriangle}
          tone="text-danger-text"
        />
        <StatCard
          label="Realizadas (mês)"
          value={stats?.completedThisMonth ?? 0}
          icon={CheckCircle2}
          tone="text-success-text"
        />
        <StatCard
          label="Corretivas abertas"
          value={stats?.openCorrectives ?? 0}
          icon={Wrench}
          tone={stats?.openCorrectives ? 'text-danger-text' : 'text-foreground'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
        <Card>
          <CardHeader>
            <CardTitle>Situação das manutenções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleStatus.every((d) => d.value === 0) ? (
              <EmptyState title="Sem dados" description="Nenhuma manutenção na seleção atual" />
            ) : (
              <ChartContainer config={statusConfig} className="mx-auto aspect-square max-h-[260px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={visibleStatus}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    stroke="var(--background)"
                    strokeWidth={3}
                  >
                    {visibleStatus.map((d) => (
                      <Cell key={d.key} fill={d.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            <ChartLegend
              items={statusData.map((d) => ({ key: d.key, label: d.name, color: d.fill, value: d.value }))}
              hidden={hiddenStatus}
              onToggle={toggleStatus}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipamentos por tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={typeConfig} className="max-h-[300px] w-full">
              <BarChart data={typeData} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="type" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} maxBarSize={56}>
                  <LabelList dataKey="count" position="top" fill={chartColors.text} fontWeight={700} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-danger-text" />
              Manutenções vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MaintenanceTable data={overdue} emptyLabel="Nenhuma manutenção vencida" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-5 text-warning-text" />
              A vencer (3 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MaintenanceTable data={upcoming} emptyLabel="Nenhuma manutenção a vencer" />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

const TABS = ['operacao', 'indicadores'] as const
type Tab = (typeof TABS)[number]

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : 'operacao'

  return (
    <>
      <PageHeader title="Dashboard" context={new Date().toLocaleDateString('pt-BR')} />
      <Tabs
        value={tab}
        onValueChange={(v) => setSearchParams(v === 'operacao' ? {} : { tab: v }, { replace: true })}
      >
        <TabsList aria-label="Visões do dashboard">
          <TabsTrigger value="operacao">
            <Activity />
            Operação
          </TabsTrigger>
          <TabsTrigger value="indicadores">
            <TrendingUp />
            Indicadores
          </TabsTrigger>
        </TabsList>
        <TabsContent value="operacao">
          <OperationTab />
        </TabsContent>
        <TabsContent value="indicadores">
          <IndicatorsTab />
        </TabsContent>
      </Tabs>
    </>
  )
}
