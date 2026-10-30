import { useEffect, useState } from 'react'
import { Gauge, Timer, Wrench, CalendarCheck, Hourglass } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import { metricsApi } from '@/services/api'
import type { MetricsSummary, MonthlyMetric } from '@/types'
import { chartColors } from '@/lib/chart-colors'
import { formatDuration } from '@/lib/format'
import {
  availabilityTone,
  complianceTone,
  COMPLIANCE_TARGET,
  overdueShare,
  percent,
} from '@/lib/metrics'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { ChartLegend } from '@/components/chart-legend'
import { EmptyState } from '@/components/empty-state'

const complianceConfig = {
  compliance: { label: 'Cumprimento (%)', color: chartColors.compliance },
} satisfies ChartConfig

const downtimeConfig = {
  withOverduePreventive: { label: 'Com preventiva vencida', color: chartColors.downtimeOverdue },
  withPreventiveOnTime: { label: 'Com preventiva em dia', color: chartColors.downtimeOnTime },
} satisfies ChartConfig

type DowntimeSeries = keyof typeof downtimeConfig

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'text-foreground',
}: {
  label: string
  value: string
  hint?: string
  icon: React.ElementType
  tone?: string
}) {
  return (
    <Card className="gap-2" data-testid={`kpi-${label}`}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-sm">{label}</CardTitle>
        <Icon className={cn('size-5', tone)} />
      </CardHeader>
      <CardContent className="space-y-1">
        <p className={cn('text-4xl leading-none font-bold tabular-nums', tone)}>{value}</p>
        {hint && <p className="text-xs font-normal text-label">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function IndicatorsTab() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null)
  const [monthly, setMonthly] = useState<MonthlyMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hidden, setHidden] = useState<string[]>([])

  useEffect(() => {
    Promise.all([metricsApi.summary(), metricsApi.monthly(6)])
      .then(([s, m]) => {
        setSummary(s)
        setMonthly(m)
      })
      .catch((e) => {
        console.error('Error loading metrics:', e)
        setError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (error || !summary) {
    return <EmptyState title="Indicadores indisponíveis" description="Não foi possível carregar os indicadores" />
  }

  const { compliance, downtime } = summary
  const share = overdueShare(monthly)
  const complianceData = monthly.map((m) => ({
    label: m.label,
    compliance: m.complianceRate === null ? null : Math.round(m.complianceRate * 100),
  }))
  const toggle = (key: string) =>
    setHidden((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  const visibleSeries = (Object.keys(downtimeConfig) as DowntimeSeries[]).filter((k) => !hidden.includes(k))

  return (
    <div className="space-y-4">
      <p className="text-sm font-normal text-label">
        Indicadores dos últimos 30 dias · {summary.equipmentCount} equipamentos ativos
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          label="Cumprimento do plano"
          value={percent(compliance.rate)}
          hint={`${compliance.onTime} de ${compliance.due} preventivas no prazo · meta ${percent(COMPLIANCE_TARGET)}`}
          icon={CalendarCheck}
          tone={complianceTone(compliance.rate)}
        />
        <Kpi
          label="Atraso médio"
          value={summary.avgDelayDays === null ? '—' : `${summary.avgDelayDays.toString().replace('.', ',')} d`}
          hint="Dias de atraso por preventiva concluída"
          icon={Hourglass}
          tone={summary.avgDelayDays ? 'text-warning-text' : 'text-foreground'}
        />
        <Kpi
          label="MTBF"
          value={downtime.mtbfHours === null ? '—' : `${Math.round(downtime.mtbfHours)} h`}
          hint="Tempo médio entre falhas"
          icon={Timer}
        />
        <Kpi
          label="MTTR"
          value={downtime.mttrMinutes === null ? '—' : formatDuration(downtime.mttrMinutes)}
          hint={`Tempo médio de reparo · ${downtime.count} parada(s)`}
          icon={Wrench}
        />
        <Kpi
          label="Disponibilidade"
          value={percent(downtime.availability, 1)}
          hint={`${formatDuration(downtime.totalMinutes)} parados no período`}
          icon={Gauge}
          tone={availabilityTone(downtime.availability)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Paradas por mês</CardTitle>
            <CardDescription>
              {share === null ? (
                'Nenhuma parada nos últimos 6 meses'
              ) : (
                <span data-testid="overdue-share">
                  <span className="font-bold text-danger-text">{percent(share)}</span> das paradas aconteceram
                  com a preventiva vencida
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChartContainer config={downtimeConfig} className="max-h-[280px] w-full">
              <BarChart data={monthly} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                {visibleSeries.map((key, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="downtime"
                    fill={`var(--color-${key})`}
                    radius={i === visibleSeries.length - 1 ? [4, 4, 0, 0] : 0}
                    maxBarSize={48}
                  />
                ))}
              </BarChart>
            </ChartContainer>
            <ChartLegend
              items={(Object.keys(downtimeConfig) as DowntimeSeries[]).map((key) => ({
                key,
                label: downtimeConfig[key].label,
                color: downtimeConfig[key].color,
                value: monthly.reduce((s, m) => s + m[key], 0),
              }))}
              hidden={hidden}
              onToggle={toggle}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cumprimento do plano por mês</CardTitle>
            <CardDescription>Preventivas concluídas até a data prevista · meta {percent(COMPLIANCE_TARGET)}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={complianceConfig} className="max-h-[300px] w-full">
              <BarChart data={complianceData} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={32} unit="%" />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <ReferenceLine
                  y={COMPLIANCE_TARGET * 100}
                  stroke={chartColors.reference}
                  strokeDasharray="4 4"
                  label={{ value: 'Meta', position: 'insideTopRight', fill: chartColors.reference, fontSize: 12 }}
                />
                <Bar dataKey="compliance" fill="var(--color-compliance)" radius={4} maxBarSize={48}>
                  <LabelList
                    dataKey="compliance"
                    position="top"
                    fill={chartColors.text}
                    fontWeight={700}
                    formatter={(v: unknown) => (v === null || v === undefined ? '' : `${v}%`)}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
