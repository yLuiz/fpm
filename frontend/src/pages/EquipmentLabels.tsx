import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { equipmentApi } from '@/services/api'
import type { Equipment } from '@/types'
import { EQUIPMENT_TYPE_LABELS } from '@/types'
import { equipmentScanUrl, publicBaseUrl } from '@/lib/qr'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'

function Label({ equipment }: { equipment: Equipment }) {
  const url = equipmentScanUrl(equipment.id)
  return (
    <figure
      data-testid="qr-label"
      data-url={url}
      className="flex break-inside-avoid items-center gap-4 rounded-xl border border-border bg-white p-4 text-black print:rounded-none print:border-black"
    >
      {/* QR sempre preto no branco: leitores precisam de contraste */}
      <QRCodeSVG value={url} size={112} level="M" marginSize={1} title={`QR Code de ${equipment.name}`} />
      <figcaption className="min-w-0 space-y-1">
        <p className="text-xs font-semibold tracking-wide text-[#555] uppercase">FPM · Manutenção</p>
        <p className="text-base leading-tight font-bold">{equipment.name}</p>
        <p className="text-sm font-normal">{EQUIPMENT_TYPE_LABELS[equipment.type]}</p>
        <p className="text-sm font-normal text-[#555]">{equipment.location}</p>
      </figcaption>
    </figure>
  )
}

export default function EquipmentLabels() {
  const [searchParams] = useSearchParams()
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ids = searchParams.get('ids')?.split(',').filter(Boolean)
    equipmentApi
      .getAll('ACTIVE')
      .then((list) => {
        setEquipment(list)
        setSelected(ids?.length ? list.filter((e) => ids.includes(e.id)).map((e) => e.id) : list.map((e) => e.id))
      })
      .catch(() => toast.error('Erro ao carregar equipamentos'))
      .finally(() => setLoading(false))
  }, [searchParams])

  const labels = useMemo(() => equipment.filter((e) => selected.includes(e.id)), [equipment, selected])
  const isLocalhost = /localhost|127\.0\.0\.1/.test(publicBaseUrl())

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          back={{ to: '/equipment', label: 'Voltar para lista' }}
          title="Etiquetas QR"
          context={`${labels.length} selecionada(s)`}
          actions={
            <Button onClick={() => window.print()} disabled={labels.length === 0}>
              <Printer />
              Imprimir
            </Button>
          }
        />
      </div>

      {isLocalhost && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-lg border border-warning/60 bg-warning/10 px-4 py-3 text-sm text-warning-text print:hidden"
        >
          <QrCode className="mt-0.5 size-4 shrink-0" />
          <span>
            O QR aponta para <strong>{publicBaseUrl()}</strong>, que não abre no celular. Acesse o sistema
            pelo IP da máquina na rede (ou defina <code>VITE_PUBLIC_URL</code>) antes de imprimir.
          </span>
        </div>
      )}

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : equipment.length === 0 ? (
        <EmptyState icon={QrCode} title="Sem dados" description="Nenhum equipamento ativo" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr] print:block">
          <fieldset className="space-y-1 rounded-xl border border-border p-3 print:hidden">
            <legend className="px-1 text-sm text-label">Equipamentos</legend>
            <div className="flex gap-2 pb-2">
              <Button size="xs" variant="outline" onClick={() => setSelected(equipment.map((e) => e.id))}>
                Todos
              </Button>
              <Button size="xs" variant="outline" onClick={() => setSelected([])}>
                Nenhum
              </Button>
            </div>
            {equipment.map((e) => (
              <label
                key={e.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-normal hover:bg-menu-hover"
              >
                <Checkbox checked={selected.includes(e.id)} onCheckedChange={() => toggle(e.id)} />
                {e.name}
              </label>
            ))}
          </fieldset>

          <div
            className={cn(
              'grid content-start gap-4 sm:grid-cols-2 2xl:grid-cols-3',
              'print:grid-cols-2 print:gap-3'
            )}
          >
            {labels.map((e) => (
              <Label key={e.id} equipment={e} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
