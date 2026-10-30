import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Loader2, CheckCircle2, AlertTriangle, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { maintenanceApi } from '../services/api'
import type { Maintenance, ChecklistResult, ChecklistResultValue, CompleteMaintenanceDto } from '../types'
import {
  EQUIPMENT_TYPE_LABELS,
  CRITICALITY_LABELS,
  MAINTENANCE_KIND_LABELS,
  CHECKLIST_RESULT_LABELS,
} from '../types'
import { formatDate, toDateTimeLocal, criticalityVariant } from '@/lib/format'
import { checklistErrors, checklistSummary, CORRECTIVE_DUE_DAYS } from '@/lib/checklist'
import { apiErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Segmented, type SegmentedOption } from '@/components/ui/segmented'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'

const RESULT_OPTIONS: SegmentedOption<ChecklistResultValue>[] = [
  { value: 'OK', label: CHECKLIST_RESULT_LABELS.OK, activeClassName: 'bg-success text-white' },
  { value: 'NOK', label: CHECKLIST_RESULT_LABELS.NOK, activeClassName: 'bg-danger text-white' },
  { value: 'NA', label: CHECKLIST_RESULT_LABELS.NA, activeClassName: 'bg-offline text-white' },
]

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-label">{label}</dt>
      <dd className="text-base">{children}</dd>
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

  const [answers, setAnswers] = useState<Record<string, ChecklistResult>>({})
  const [concludedAt, setConcludedAt] = useState(toDateTimeLocal(new Date()))
  const [observations, setObservations] = useState('')

  useEffect(() => {
    if (id) loadMaintenance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadMaintenance = async () => {
    try {
      const maintenanceData = await maintenanceApi.getById(id!)
      setMaintenance(maintenanceData)
      if (maintenanceData.kind === 'PREVENTIVE' && maintenanceData.equipment) {
        const checklistData = await maintenanceApi.getChecklist(maintenanceData.equipment.type)
        setChecklistItems(checklistData.items)
      }
    } catch (error) {
      console.error('Error loading maintenance:', error)
      toast.error('Erro ao carregar manutenção')
    } finally {
      setLoading(false)
    }
  }

  const setResult = (item: string, result: ChecklistResultValue) =>
    setAnswers((prev) => ({ ...prev, [item]: { ...prev[item], item, result } }))

  const setNote = (item: string, note: string) =>
    setAnswers((prev) => ({ ...prev, [item]: { ...prev[item], note } }))

  const markAllOk = () =>
    setAnswers((prev) =>
      Object.fromEntries(
        checklistItems.map((item) => [item, prev[item]?.result ? prev[item] : { item, result: 'OK' }])
      )
    )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!maintenance) return
    const isPreventive = maintenance.kind === 'PREVENTIVE'

    let dto: CompleteMaintenanceDto
    if (isPreventive) {
      const errors = checklistErrors(checklistItems, answers)
      if (errors.length > 0) {
        toast.error(errors[0])
        return
      }
      dto = {
        concludedAt: new Date(concludedAt).toISOString(),
        checklist: checklistItems.map((item) => {
          const { result, note } = answers[item]
          return result === 'NOK' ? { item, result, note: note?.trim() } : { item, result }
        }),
        observations: observations.trim() || undefined,
      }
    } else {
      if (!observations.trim()) {
        toast.error('Descreva a solução aplicada')
        return
      }
      dto = { concludedAt: new Date(concludedAt).toISOString(), observations: observations.trim() }
    }

    setSaving(true)
    try {
      const result = await maintenanceApi.complete(id!, dto)
      if (result.corrective) {
        const correctiveId = result.corrective.id
        toast.warning('Ordem corretiva aberta', {
          description: `Prazo: ${formatDate(result.corrective.dueDate)}`,
          action: { label: 'Abrir', onClick: () => navigate(`/maintenance/${correctiveId}/register`) },
        })
      } else {
        toast.success('Manutenção registrada com sucesso')
      }
      navigate(`/equipment/${maintenance.equipmentId}`)
    } catch (error) {
      console.error('Error completing maintenance:', error)
      toast.error(apiErrorMessage(error, 'Erro ao registrar manutenção'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    )
  }

  if (!maintenance) {
    return (
      <EmptyState title="Manutenção não encontrada">
        <Button asChild variant="outline">
          <Link to="/">Voltar para o Dashboard</Link>
        </Button>
      </EmptyState>
    )
  }

  if (maintenance.status === 'DONE') {
    return (
      <EmptyState icon={CheckCircle2} title="Esta manutenção já foi concluída">
        <Button asChild variant="outline">
          <Link to={`/equipment/${maintenance.equipmentId}`}>Ver equipamento</Link>
        </Button>
      </EmptyState>
    )
  }

  const isPreventive = maintenance.kind === 'PREVENTIVE'
  const summary = checklistSummary(Object.values(answers).filter((a) => a.result))
  const criticality = maintenance.equipment?.criticality ?? 'MEDIUM'

  return (
    <>
      <PageHeader
        back={{ to: `/equipment/${maintenance.equipmentId}`, label: 'Voltar para equipamento' }}
        title={isPreventive ? 'Registrar preventiva' : 'Registrar corretiva'}
        context={maintenance.equipment?.name}
        actions={
          <Badge variant={isPreventive ? 'info' : 'destructive'}>
            {MAINTENANCE_KIND_LABELS[maintenance.kind]}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <InfoRow label="Equipamento">{maintenance.equipment?.name}</InfoRow>
              <InfoRow label="Tipo">
                {EQUIPMENT_TYPE_LABELS[maintenance.equipment?.type ?? 'MOTOR']}
              </InfoRow>
              <InfoRow label="Local">{maintenance.equipment?.location}</InfoRow>
              <InfoRow label="Criticidade">
                <Badge variant={criticalityVariant[criticality]}>{CRITICALITY_LABELS[criticality]}</Badge>
              </InfoRow>
              <InfoRow label="Data prevista">{formatDate(maintenance.dueDate)}</InfoRow>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{isPreventive ? 'Checklist da preventiva' : 'Correção'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {isPreventive ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <Label>Resultado de cada item *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={markAllOk}>
                      <CheckCheck />
                      Pendentes como OK
                    </Button>
                  </div>
                  <ul className="divide-y divide-surface-strong rounded-xl border border-border bg-surface">
                    {checklistItems.map((item) => {
                      const answer = answers[item]
                      return (
                        <li key={item} className="space-y-2 px-3 py-3" data-testid="checklist-item">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm">{item}</span>
                            <Segmented
                              aria-label={item}
                              value={answer?.result}
                              options={RESULT_OPTIONS}
                              onChange={(v) => setResult(item, v)}
                            />
                          </div>
                          {answer?.result === 'NOK' && (
                            <Input
                              aria-label={`Problema encontrado em ${item}`}
                              placeholder="Descreva o problema encontrado *"
                              value={answer.note ?? ''}
                              onChange={(e) => setNote(item, e.target.value)}
                              className={cn(!answer.note?.trim() && 'border-error-form')}
                            />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  <p className="mt-2 text-xs text-label">
                    {summary.total} de {checklistItems.length} respondidos · {summary.ok} OK ·{' '}
                    {summary.nok} Não OK · {summary.na} N.A.
                  </p>
                  {summary.nok > 0 && (
                    <div
                      role="status"
                      className="mt-3 flex items-start gap-2 rounded-lg border border-danger bg-danger/15 px-3 py-2 text-sm text-danger-text"
                    >
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <span>
                        Será aberta uma ordem corretiva com prazo de {CORRECTIVE_DUE_DAYS[criticality]}{' '}
                        dia(s) (criticidade {CRITICALITY_LABELS[criticality].toLowerCase()}).
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                maintenance.description && (
                  <div className="rounded-xl border border-danger/60 bg-danger/10 p-3">
                    <p className="mb-1 text-sm text-label">Achados da preventiva</p>
                    <p className="text-sm font-normal whitespace-pre-line">{maintenance.description}</p>
                  </div>
                )
              )}

              <div className="space-y-2">
                <Label htmlFor="concludedAt">Data/hora da conclusão</Label>
                <Input
                  id="concludedAt"
                  type="datetime-local"
                  value={concludedAt}
                  onChange={(e) => setConcludedAt(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">{isPreventive ? 'Observações' : 'Solução aplicada *'}</Label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder={
                    isPreventive
                      ? 'Observações adicionais sobre a manutenção...'
                      : 'O que foi feito para corrigir o problema...'
                  }
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />}
                  {isPreventive ? 'Registrar preventiva' : 'Concluir corretiva'}
                </Button>
                <Button asChild variant="outline" type="button">
                  <Link to={`/equipment/${maintenance.equipmentId}`}>Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
