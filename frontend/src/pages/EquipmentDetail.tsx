import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Pencil, Wrench, History, AlertTriangle, OctagonAlert, Power, QrCode } from 'lucide-react'
import { equipmentApi } from '../services/api'
import type { Equipment, Maintenance } from '../types'
import {
  EQUIPMENT_TYPE_LABELS,
  CRITICALITY_LABELS,
  STATUS_LABELS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_KIND_LABELS,
  DOWNTIME_CAUSE_LABELS,
} from '../types'
import {
  formatDate,
  formatDateTime,
  getMaintenanceStatus,
  criticalityVariant,
  equipmentStatusVariant,
  maintenanceStatusVariant,
  formatDuration,
  minutesBetween,
} from '@/lib/format'
import { checklistSummary, normalizeChecklist } from '@/lib/checklist'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { useNow } from '@/hooks/use-now'

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-label">{label}</dt>
      <dd className="text-base">{children}</dd>
    </div>
  )
}

function KindBadge({ m }: { m: Pick<Maintenance, 'kind'> }) {
  return (
    <Badge variant={m.kind === 'CORRECTIVE' ? 'destructive' : 'outline'}>
      {MAINTENANCE_KIND_LABELS[m.kind]}
    </Badge>
  )
}

function ChecklistCell({ m }: { m: Maintenance }) {
  const results = normalizeChecklist(m.checklist)
  if (results.length === 0) return <span className="text-label">—</span>
  const s = checklistSummary(results)
  const nokItems = results.filter((r) => r.result === 'NOK')
  return (
    <span
      className={s.nok > 0 ? 'font-semibold text-danger-text' : 'text-success-text'}
      title={nokItems.map((r) => `${r.item}: ${r.note ?? ''}`).join('\n') || undefined}
    >
      {s.nok > 0 ? `${s.nok} Não OK` : `${s.ok} OK`}
      {s.na > 0 && <span className="text-label"> · {s.na} N.A.</span>}
    </span>
  )
}

const byDueDateAsc = (a: Maintenance, b: Maintenance) =>
  new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>()
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const now = useNow()

  useEffect(() => {
    if (id) loadEquipment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!equipment) {
    return (
      <EmptyState title="Equipamento não encontrado">
        <Button asChild variant="outline">
          <Link to="/equipment">Voltar para lista</Link>
        </Button>
      </EmptyState>
    )
  }

  const maintenances = equipment.maintenances ?? []
  const scheduled = maintenances.filter((m) => m.status === 'SCHEDULED').sort(byDueDateAsc)
  const nextPreventive = scheduled.find((m) => m.kind === 'PREVENTIVE')
  const openCorrectives = scheduled.filter((m) => m.kind === 'CORRECTIVE')
  const openDowntime = equipment.downtimes?.[0]

  return (
    <>
      <PageHeader
        back={{ to: '/equipment', label: 'Voltar para lista' }}
        title={equipment.name}
        context={EQUIPMENT_TYPE_LABELS[equipment.type]}
        actions={
          <>
            {openDowntime ? (
              <Button variant="outline" onClick={() => setCloseOpen(true)}>
                <Power />
                Encerrar parada
              </Button>
            ) : (
              <Button variant="destructive" onClick={() => setRegisterOpen(true)}>
                <OctagonAlert />
                Registrar parada
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to={`/equipment/labels?ids=${equipment.id}`}>
                <QrCode />
                Etiqueta QR
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/equipment/${equipment.id}/edit`}>
                <Pencil />
                Editar
              </Link>
            </Button>
            {nextPreventive && (
              <Button asChild>
                <Link to={`/maintenance/${nextPreventive.id}/register`}>
                  <Wrench />
                  Registrar preventiva
                </Link>
              </Button>
            )}
          </>
        }
      />

      {openDowntime && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-danger bg-danger/15 px-4 py-3"
        >
          <span className="size-3 animate-blink rounded-full bg-danger-text" />
          <span className="font-semibold text-danger-text">
            Equipamento parado há {formatDuration(minutesBetween(openDowntime.startedAt, null, now))}
          </span>
          <span className="text-sm font-normal text-text-soft">
            {DOWNTIME_CAUSE_LABELS[openDowntime.cause]} · {openDowntime.description}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              <InfoItem label="Tipo">{EQUIPMENT_TYPE_LABELS[equipment.type]}</InfoItem>
              <InfoItem label="Localização">{equipment.location}</InfoItem>
              <InfoItem label="Criticidade">
                <Badge variant={criticalityVariant[equipment.criticality]}>
                  {CRITICALITY_LABELS[equipment.criticality]}
                </Badge>
              </InfoItem>
              <InfoItem label="Status">
                {openDowntime ? (
                  <Badge variant="destructive">Parado</Badge>
                ) : (
                  <Badge variant={equipmentStatusVariant[equipment.status]}>
                    {STATUS_LABELS[equipment.status]}
                  </Badge>
                )}
              </InfoItem>
              <InfoItem label="Cadastrado em">{formatDate(equipment.createdAt)}</InfoItem>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próxima preventiva</CardTitle>
          </CardHeader>
          <CardContent>
            {nextPreventive ? (
              <div className="space-y-3">
                <p className="text-4xl leading-none font-bold tabular-nums">
                  {formatDate(nextPreventive.dueDate)}
                </p>
                {(() => {
                  const s = getMaintenanceStatus(nextPreventive.dueDate, nextPreventive.status)
                  return <Badge variant={maintenanceStatusVariant[s]}>{MAINTENANCE_STATUS_LABELS[s]}</Badge>
                })()}
              </div>
            ) : (
              <EmptyState title="Sem dados" description="Nenhuma preventiva agendada" />
            )}
          </CardContent>
        </Card>
      </div>

      {openCorrectives.length > 0 && (
        <Card className="border-danger hover:border-danger">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-danger-text" />
              Corretivas abertas ({openCorrectives.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openCorrectives.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-surface p-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm">
                    Prazo: <span className="font-semibold">{formatDate(c.dueDate)}</span>{' '}
                    {(() => {
                      const s = getMaintenanceStatus(c.dueDate, c.status)
                      return s === 'OVERDUE' && <Badge variant="destructive">Vencida</Badge>
                    })()}
                  </p>
                  <p className="text-sm font-normal whitespace-pre-line text-text-soft">{c.description}</p>
                </div>
                <Button asChild variant="details" size="sm">
                  <Link to={`/maintenance/${c.id}/register`}>
                    <Wrench />
                    Registrar correção
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico de manutenções</CardTitle>
        </CardHeader>
        <CardContent>
          {maintenances.length === 0 ? (
            <EmptyState icon={History} title="Sem dados" description="Nenhuma manutenção registrada" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data prevista</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Conclusão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Checklist</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenances.map((m) => {
                  const s = getMaintenanceStatus(m.dueDate, m.status)
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-semibold">{formatDate(m.dueDate)}</TableCell>
                      <TableCell>
                        <KindBadge m={m} />
                      </TableCell>
                      <TableCell>{m.concludedAt ? formatDateTime(m.concludedAt) : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={maintenanceStatusVariant[s]}>{MAINTENANCE_STATUS_LABELS[s]}</Badge>
                      </TableCell>
                      <TableCell>
                        <ChecklistCell m={m} />
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={m.observations ?? undefined}>
                        {m.observations || '—'}
                      </TableCell>
                      <TableCell>
                        {m.status === 'SCHEDULED' ? (
                          <Button asChild variant="details" size="sm">
                            <Link to={`/maintenance/${m.id}/register`}>
                              <Wrench />
                              Registrar
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-text-soft">Concluída</span>
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

      <RegisterDowntimeDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        equipment={equipment}
        onCreated={loadEquipment}
      />
      {openDowntime && (
        <CloseDowntimeDialog
          downtime={{ ...openDowntime, equipmentName: equipment.name }}
          open={closeOpen}
          onOpenChange={setCloseOpen}
          onClosed={loadEquipment}
        />
      )}
    </>
  )
}
