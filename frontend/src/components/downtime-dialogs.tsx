import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { downtimeApi, equipmentApi } from '@/services/api'
import type { Downtime, DowntimeCause, Equipment } from '@/types'
import { DOWNTIME_CAUSE_LABELS } from '@/types'
import { formatDateTime, toDateTimeLocal } from '@/lib/format'
import { apiErrorMessage } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface RegisterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Equipamento fixo (detalhe do equipamento); sem ele, o usuário escolhe na lista */
  equipment?: Pick<Equipment, 'id' | 'name'>
  onCreated: (downtime: Downtime) => void
}

export function RegisterDowntimeDialog({ open, onOpenChange, equipment, onCreated }: RegisterProps) {
  const [options, setOptions] = useState<Equipment[]>([])
  const [equipmentId, setEquipmentId] = useState(equipment?.id ?? '')
  const [startedAt, setStartedAt] = useState(toDateTimeLocal(new Date()))
  const [cause, setCause] = useState<DowntimeCause | ''>('')
  const [description, setDescription] = useState('')
  const [openCorrective, setOpenCorrective] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setEquipmentId(equipment?.id ?? '')
    setStartedAt(toDateTimeLocal(new Date()))
    setCause('')
    setDescription('')
    setOpenCorrective(true)
    if (!equipment) {
      // Só equipamentos ativos e que não estão parados
      equipmentApi
        .getAll('ACTIVE')
        .then((list) => setOptions(list.filter((e) => !e.downtimes?.length)))
        .catch(() => toast.error('Erro ao carregar equipamentos'))
    }
  }, [open, equipment])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!equipmentId || !cause || !description.trim()) {
      toast.error('Preencha equipamento, causa e descrição')
      return
    }
    setSaving(true)
    try {
      const created = await downtimeApi.create({
        equipmentId,
        startedAt: new Date(startedAt).toISOString(),
        cause,
        description: description.trim(),
        openCorrective,
      })
      toast.success(
        created.corrective ? 'Parada registrada e corretiva aberta' : 'Parada registrada'
      )
      onOpenChange(false)
      onCreated(created)
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Erro ao registrar parada'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar parada</DialogTitle>
          <DialogDescription>
            {equipment ? equipment.name : 'Equipamento parou de forma não planejada'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {!equipment && (
            <div className="space-y-2">
              <Label htmlFor="downtime-equipment">Equipamento *</Label>
              <Select value={equipmentId} onValueChange={setEquipmentId}>
                <SelectTrigger id="downtime-equipment" className="w-full">
                  <SelectValue placeholder="Selecione o equipamento" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {options.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="downtime-start">Início *</Label>
              <Input
                id="downtime-start"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="downtime-cause">Causa *</Label>
              <Select value={cause} onValueChange={(v) => setCause(v as DowntimeCause)}>
                <SelectTrigger id="downtime-cause" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {(Object.keys(DOWNTIME_CAUSE_LABELS) as DowntimeCause[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {DOWNTIME_CAUSE_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="downtime-description">O que aconteceu *</Label>
            <Textarea
              id="downtime-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: motor travou e desarmou o disjuntor"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <Checkbox checked={openCorrective} onCheckedChange={(v) => setOpenCorrective(v === true)} />
            Abrir ordem corretiva para o reparo
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Registrar parada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface CloseProps {
  downtime: Pick<Downtime, 'id' | 'startedAt'> & { equipmentName?: string }
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed: (downtime: Downtime) => void
}

export function CloseDowntimeDialog({ downtime, open, onOpenChange, onClosed }: CloseProps) {
  const [endedAt, setEndedAt] = useState(toDateTimeLocal(new Date()))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setEndedAt(toDateTimeLocal(new Date()))
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const closed = await downtimeApi.close(downtime.id, new Date(endedAt).toISOString())
      toast.success('Parada encerrada; equipamento voltou a operar')
      onOpenChange(false)
      onClosed(closed)
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Erro ao encerrar parada'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Encerrar parada</DialogTitle>
          <DialogDescription>
            {downtime.equipmentName ? `${downtime.equipmentName} · ` : ''}parado desde{' '}
            {formatDateTime(downtime.startedAt)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="downtime-end">Voltou a operar em</Label>
            <Input
              id="downtime-end"
              type="datetime-local"
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Encerrar parada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
