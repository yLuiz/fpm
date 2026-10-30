import type { Equipment, Maintenance } from '@/types'

/** Prazo (dias) a partir do qual a preventiva já é tratada como "a fazer agora" ao escanear. */
export const SCAN_UPCOMING_DAYS = 3

/**
 * Endereço público usado no QR Code. No celular, `localhost` aponta para o próprio
 * aparelho: defina VITE_PUBLIC_URL com o IP da máquina na rede (ex.: http://192.168.0.10:5173)
 * ou abra o sistema por esse IP antes de imprimir as etiquetas.
 */
export function publicBaseUrl() {
  const configured = import.meta.env.VITE_PUBLIC_URL as string | undefined
  return (configured || window.location.origin).replace(/\/+$/, '')
}

export function equipmentScanPath(id: string) {
  return `/e/${id}`
}

export function equipmentScanUrl(id: string) {
  return `${publicBaseUrl()}${equipmentScanPath(id)}`
}

/**
 * Destino ao escanear o QR do equipamento, pela urgência:
 * corretiva aberta → preventiva vencida ou a vencer em até 3 dias → detalhe do equipamento.
 */
export function scanTarget(equipment: Pick<Equipment, 'id' | 'maintenances'>, now = new Date()) {
  const open = (equipment.maintenances ?? [])
    .filter((m) => m.status === 'SCHEDULED')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  const corrective = open.find((m) => m.kind === 'CORRECTIVE')
  if (corrective) return registerPath(corrective)

  const limit = new Date(now)
  limit.setDate(limit.getDate() + SCAN_UPCOMING_DAYS)
  limit.setHours(23, 59, 59, 999)
  const preventive = open.find((m) => m.kind === 'PREVENTIVE' && new Date(m.dueDate) <= limit)
  if (preventive) return registerPath(preventive)

  return `/equipment/${equipment.id}`
}

function registerPath(m: Pick<Maintenance, 'id'>) {
  return `/maintenance/${m.id}/register`
}
