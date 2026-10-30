import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  averageDelayDays,
  compliance,
  DAY_MS,
  downtimeIndicators,
  lastMonths,
  Period,
} from './metrics.calc';

const DEFAULT_DAYS = 30;

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  private async load(period: Period) {
    // Mesmo filtro em preventivas, paradas e horas disponíveis: inativos e excluídos
    // saem de todos os lados da conta (antes a parada entrava e as horas não)
    const equipmentFilter = { deletedAt: null, status: 'ACTIVE' as const };
    const [preventives, downtimes, equipment] = await Promise.all([
      // Prazo no período (cumprimento) ou conclusão no período (atraso médio)
      this.prisma.maintenance.findMany({
        where: {
          kind: 'PREVENTIVE',
          deletedAt: null,
          equipment: equipmentFilter,
          OR: [
            { dueDate: { gte: period.from, lte: period.to } },
            { concludedAt: { gte: period.from, lte: period.to } },
          ],
        },
        select: { dueDate: true, status: true, concludedAt: true },
      }),
      this.prisma.downtime.findMany({
        where: {
          deletedAt: null,
          equipment: equipmentFilter,
          startedAt: { lte: period.to },
          OR: [{ endedAt: null }, { endedAt: { gte: period.from } }],
        },
        select: { startedAt: true, endedAt: true, preventiveOverdue: true },
      }),
      this.prisma.equipment.findMany({ where: equipmentFilter, select: { createdAt: true } }),
    ]);
    return { preventives, downtimes, equipment };
  }

  /** Indicadores do período (padrão: últimos 30 dias). */
  async summary(from?: string, to?: string) {
    const now = new Date();
    const period = {
      from: from ? new Date(from) : new Date(now.getTime() - DEFAULT_DAYS * DAY_MS),
      to: to ? new Date(to) : now,
    };
    if (period.from > period.to) {
      throw new BadRequestException('O início do período deve ser anterior ao fim');
    }

    const { preventives, downtimes, equipment } = await this.load(period);
    return {
      from: period.from,
      to: period.to,
      equipmentCount: equipment.length,
      compliance: compliance(preventives, period, now),
      avgDelayDays: averageDelayDays(preventives, period),
      downtime: downtimeIndicators(downtimes, period, equipment, now),
    };
  }

  /** Série mensal (meses de calendário) de cumprimento e paradas. */
  async monthly(months = 6) {
    const now = new Date();
    const series = lastMonths(months, now);
    const whole = { from: series[0].from, to: series[series.length - 1].to };
    const { preventives, downtimes, equipment } = await this.load(whole);

    return series.map((month) => {
      const c = compliance(preventives, month, now);
      const d = downtimeIndicators(downtimes, month, equipment, now);
      return {
        month: month.key,
        label: month.label,
        complianceRate: c.rate,
        due: c.due,
        onTime: c.onTime,
        downtimes: d.count,
        withOverduePreventive: d.withOverduePreventive,
        withPreventiveOnTime: d.withPreventiveOnTime,
        downtimeMinutes: d.totalMinutes,
      };
    });
  }
}
