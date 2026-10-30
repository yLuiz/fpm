import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { OctagonAlert, Power, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { downtimeApi } from '@/services/api'
import type { Downtime } from '@/types'
import { DOWNTIME_CAUSE_LABELS } from '@/types'
import { formatDateTime, formatDuration, minutesBetween } from '@/lib/format'
import { useNow } from '@/hooks/use-now'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Segmented } from '@/components/ui/segmented'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { RegisterDowntimeDialog, CloseDowntimeDialog } from '@/components/downtime-dialogs'

type Filter = 'open' | 'closed' | 'all'

const FILTERS = [
  { value: 'open' as const, label: 'Em andamento' },
  { value: 'closed' as const, label: 'Encerradas' },
  { value: 'all' as const, label: 'Todas' },
]

export default function Downtimes() {
  const [filter, setFilter] = useState<Filter>('all')
  const [downtimes, setDowntimes] = useState<Downtime[]>([])
  const [loading, setLoading] = useState(true)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [closing, setClosing] = useState<Downtime | null>(null)
  const now = useNow()

  const load = useCallback(async () => {
    try {
      const open = filter === 'all' ? undefined : filter === 'open'
      setDowntimes(await downtimeApi.list({ open }))
    } catch (error) {
      console.error('Error loading downtimes:', error)
      toast.error('Erro ao carregar paradas')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const openCount = downtimes.filter((d) => !d.endedAt).length

  return (
    <>
      <PageHeader
        title="Paradas"
        context="Paradas não planejadas de equipamentos"
        actions={
          <Button variant="destructive" onClick={() => setRegisterOpen(true)}>
            <Plus />
            Registrar parada
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            Histórico de paradas
            {filter !== 'closed' && openCount > 0 && (
              <Badge variant="destructive">
                <span className="size-2 animate-blink rounded-full bg-danger-text" />
                {openCount} em andamento
              </Badge>
            )}
          </CardTitle>
          <Segmented aria-label="Filtrar paradas" value={filter} options={FILTERS} onChange={setFilter} />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : downtimes.length === 0 ? (
            <EmptyState icon={OctagonAlert} title="Sem dados" description="Nenhuma parada registrada" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Causa</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Preventiva vencida?</TableHead>
                  <TableHead>Corretiva</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {downtimes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link
                        to={`/equipment/${d.equipmentId}`}
                        className="font-semibold text-accent-solid transition-colors duration-300 hover:text-accent-hover"
                      >
                        {d.equipment?.name}
                      </Link>
                      <p className="max-w-56 truncate text-xs text-label" title={d.description}>
                        {d.description}
                      </p>
                    </TableCell>
                    <TableCell>{DOWNTIME_CAUSE_LABELS[d.cause]}</TableCell>
                    <TableCell>{formatDateTime(d.startedAt)}</TableCell>
                    <TableCell>
                      {d.endedAt ? (
                        formatDateTime(d.endedAt)
                      ) : (
                        <Badge variant="destructive">
                          <span className="size-2 animate-blink rounded-full bg-danger-text" />
                          Parado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {formatDuration(minutesBetween(d.startedAt, d.endedAt, now))}
                    </TableCell>
                    <TableCell>
                      {d.preventiveOverdue ? (
                        <Badge variant="warning">Sim</Badge>
                      ) : (
                        <Badge variant="success">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.corrective ? (
                        <Link
                          to={`/maintenance/${d.corrective.id}/register`}
                          className="text-accent-solid hover:text-accent-hover"
                        >
                          {d.corrective.status === 'DONE' ? 'Concluída' : 'Aberta'}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {!d.endedAt && (
                        <Button variant="details" size="sm" onClick={() => setClosing(d)}>
                          <Power />
                          Encerrar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RegisterDowntimeDialog open={registerOpen} onOpenChange={setRegisterOpen} onCreated={load} />
      {closing && (
        <CloseDowntimeDialog
          downtime={{ ...closing, equipmentName: closing.equipment?.name }}
          open={!!closing}
          onOpenChange={(o) => !o && setClosing(null)}
          onClosed={load}
        />
      )}
    </>
  )
}
