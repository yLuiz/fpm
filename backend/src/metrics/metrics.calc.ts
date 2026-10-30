/**
 * Cálculo dos indicadores de manutenção. Funções puras (sem banco) para serem testáveis.
 *
 * - Cumprimento do plano: preventivas vencíveis no período concluídas até o fim do dia do prazo.
 * - Atraso médio: dias de atraso das preventivas concluídas no período (0 se no prazo).
 * - MTTR: duração média das paradas encerradas iniciadas no período.
 * - MTBF: horas de operação (horas disponíveis − horas paradas) por parada.
 * - Disponibilidade: 1 − horas paradas / horas disponíveis.
 * - Horas disponíveis: soma, por equipamento, do tempo do período em que ele já estava
 *   cadastrado (equipamento novo não aumenta as horas de meses passados).
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface Period {
  from: Date;
  to: Date;
}

export interface PreventiveRecord {
  dueDate: Date;
  status: 'SCHEDULED' | 'DONE';
  concludedAt: Date | null;
}

export interface DowntimeRecord {
  startedAt: Date;
  endedAt: Date | null;
  preventiveOverdue: boolean;
}

export interface EquipmentRecord {
  createdAt: Date;
}

/** Minutos do período em que cada equipamento existia, somados (contados até `now`). */
export function availableMinutes(equipment: EquipmentRecord[], period: Period, now: Date) {
  const end = Math.min(period.to.getTime(), now.getTime());
  return equipment.reduce((sum, e) => {
    const start = Math.max(period.from.getTime(), e.createdAt.getTime());
    return sum + (end > start ? (end - start) / 60000 : 0);
  }, 0);
}

export function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

const inPeriod = (date: Date, p: Period) => date >= p.from && date <= p.to;
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

export function compliance(preventives: PreventiveRecord[], period: Period, now: Date) {
  // Vencíveis: prazo no período e já "cobráveis" (concluídas ou com o dia do prazo encerrado)
  const due = preventives.filter(
    (p) =>
      inPeriod(p.dueDate, period) &&
      (p.status === 'DONE' || endOfDay(p.dueDate) < now),
  );
  const onTime = due.filter(
    (p) => p.status === 'DONE' && p.concludedAt !== null && p.concludedAt <= endOfDay(p.dueDate),
  ).length;
  return {
    due: due.length,
    onTime,
    rate: due.length > 0 ? round(onTime / due.length, 4) : null,
  };
}

export function delayDays(p: PreventiveRecord) {
  if (!p.concludedAt) return 0;
  const late = p.concludedAt.getTime() - endOfDay(p.dueDate).getTime();
  return late > 0 ? Math.ceil(late / DAY_MS) : 0;
}

export function averageDelayDays(preventives: PreventiveRecord[], period: Period) {
  const concluded = preventives.filter(
    (p) => p.status === 'DONE' && p.concludedAt !== null && inPeriod(p.concludedAt, period),
  );
  if (concluded.length === 0) return null;
  return round(concluded.reduce((sum, p) => sum + delayDays(p), 0) / concluded.length, 1);
}

/** Minutos de uma parada dentro do período (parada aberta conta até `now`). */
export function overlapMinutes(d: DowntimeRecord, period: Period, now: Date) {
  const start = Math.max(d.startedAt.getTime(), period.from.getTime());
  const end = Math.min((d.endedAt ?? now).getTime(), period.to.getTime(), now.getTime());
  return end > start ? (end - start) / 60000 : 0;
}

export function downtimeIndicators(
  downtimes: DowntimeRecord[],
  period: Period,
  equipment: EquipmentRecord[],
  now: Date,
) {
  const available = availableMinutes(equipment, period, now);

  const downMinutes = downtimes.reduce((sum, d) => sum + overlapMinutes(d, period, now), 0);
  const failures = downtimes.filter((d) => inPeriod(d.startedAt, period));
  const repaired = failures.filter((d) => d.endedAt !== null);
  const repairMinutes = repaired.reduce(
    (sum, d) => sum + (d.endedAt!.getTime() - d.startedAt.getTime()) / 60000,
    0,
  );

  return {
    count: failures.length,
    withOverduePreventive: failures.filter((d) => d.preventiveOverdue).length,
    withPreventiveOnTime: failures.filter((d) => !d.preventiveOverdue).length,
    totalMinutes: Math.round(downMinutes),
    mttrMinutes: repaired.length > 0 ? Math.round(repairMinutes / repaired.length) : null,
    mtbfHours:
      failures.length > 0 && available > 0
        ? round(Math.max(0, available - downMinutes) / 60 / failures.length, 1)
        : null,
    // Limitado a [0, 1]: parada anterior ao cadastro (dado antigo) não gera valor negativo
    availability: available > 0 ? round(Math.max(0, 1 - downMinutes / available), 4) : null,
  };
}

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Os últimos `count` meses de calendário (o atual incluso), do mais antigo ao mais recente. */
export function lastMonths(count: number, now: Date) {
  const months: (Period & { key: string; label: string })[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 0, 23, 59, 59, 999);
    const key = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTH_LABELS[from.getMonth()]}/${String(from.getFullYear()).slice(2)}`;
    months.push({ from, to, key, label });
  }
  return months;
}
