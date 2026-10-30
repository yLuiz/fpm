import { BadRequestException } from '@nestjs/common';
import { MetricsService } from './metrics.service';

function build() {
  const prisma = {
    maintenance: { findMany: jest.fn().mockResolvedValue([]) },
    downtime: { findMany: jest.fn().mockResolvedValue([]) },
    equipment: {
      findMany: jest.fn().mockResolvedValue(Array.from({ length: 4 }, () => ({ createdAt: new Date('2020-01-01') }))),
    },
  };
  return { service: new MetricsService(prisma as any), prisma };
}

describe('MetricsService', () => {
  it('summary usa os últimos 30 dias por padrão', async () => {
    const { service, prisma } = build();
    const before = Date.now();

    const result = await service.summary();

    const days = (result.to.getTime() - result.from.getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(30);
    expect(result.to.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.equipmentCount).toBe(4);
    expect(result.compliance).toEqual({ due: 0, onTime: 0, rate: null });
    expect(result.downtime.availability).toBe(1);
    // Só preventivas, de equipamentos ativos e não excluídos; o mesmo filtro nas paradas
    // e nas horas disponíveis
    const activeOnly = { deletedAt: null, status: 'ACTIVE' };
    expect(prisma.maintenance.findMany.mock.calls[0][0].where).toMatchObject({
      kind: 'PREVENTIVE',
      deletedAt: null,
      equipment: activeOnly,
    });
    expect(prisma.downtime.findMany.mock.calls[0][0].where.equipment).toEqual(activeOnly);
    expect(prisma.equipment.findMany.mock.calls[0][0].where).toEqual(activeOnly);
  });

  it('summary recusa período invertido', async () => {
    await expect(
      build().service.summary('2026-02-01T00:00:00Z', '2026-01-01T00:00:00Z'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('monthly devolve um item por mês com o mês atual por último', async () => {
    const { service } = build();
    const series = await service.monthly(6);
    expect(series).toHaveLength(6);
    const now = new Date();
    expect(series[5].month).toBe(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    expect(series[0]).toMatchObject({ complianceRate: null, downtimes: 0 });
  });
});
