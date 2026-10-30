import { DowntimeCause } from '@prisma/client';

export const DOWNTIME_CAUSE_LABELS: Record<DowntimeCause, string> = {
  MECHANICAL: 'Mecânica',
  ELECTRICAL: 'Elétrica',
  OPERATIONAL: 'Operacional',
  OTHER: 'Outra',
};

/** Tolerância para relógios dessincronizados ao informar o início da parada. */
export const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

interface PreventiveSnapshot {
  dueDate: Date;
  status: 'SCHEDULED' | 'DONE';
  concludedAt: Date | null;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * O equipamento tinha preventiva vencida no instante `at`?
 * Vencida = prazo anterior ao dia de `at` e, naquele instante, ainda não concluída
 * (agendada até hoje, ou concluída só depois da parada).
 */
export function wasPreventiveOverdue(preventives: PreventiveSnapshot[], at: Date) {
  const day = startOfDay(at);
  return preventives.some(
    (p) =>
      p.dueDate < day &&
      (p.status === 'SCHEDULED' || (p.concludedAt !== null && p.concludedAt > at)),
  );
}

export function correctiveFromDowntime(cause: DowntimeCause, description: string) {
  return `Parada (${DOWNTIME_CAUSE_LABELS[cause].toLowerCase()}): ${description}`;
}

/** Duração em minutos; parada aberta conta até `now`. */
export function downtimeMinutes(startedAt: Date, endedAt: Date | null, now = new Date()) {
  const end = endedAt ?? now;
  return Math.max(0, Math.round((end.getTime() - startedAt.getTime()) / 60000));
}
