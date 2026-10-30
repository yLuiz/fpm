import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Loader2, QrCode } from 'lucide-react'
import { equipmentApi } from '@/services/api'
import { scanTarget } from '@/lib/qr'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/empty-state'

/** Destino do QR Code colado no equipamento: leva à pendência mais urgente. */
export default function EquipmentScan() {
  const { id } = useParams<{ id: string }>()
  const [target, setTarget] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    equipmentApi
      .getById(id!)
      .then((equipment) => setTarget(scanTarget(equipment)))
      .catch(() => setNotFound(true))
  }, [id])

  if (notFound) {
    return (
      <EmptyState icon={QrCode} title="Equipamento não encontrado" description="A etiqueta pode estar desatualizada">
        <Button asChild variant="outline">
          <Link to="/equipment">Ver equipamentos</Link>
        </Button>
      </EmptyState>
    )
  }

  if (target) return <Navigate to={target} replace />

  return (
    <div className="flex h-64 items-center justify-center gap-2 text-label">
      <Loader2 className="size-5 animate-spin text-accent-solid" />
      Abrindo equipamento...
    </div>
  )
}
