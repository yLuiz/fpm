import { MetricsService } from '../../src/metrics/metrics.service';
import { runSeed } from '../../prisma/seed';
import { prisma, resetDb, createEquipment, daysFromNow } from '../utils/db';

describe('Indicadores (integração com banco)', () => {
  const service = new MetricsService(prisma as any);

  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it('calcula cumprimento, atraso e paradas a partir dos registros', async () => {
    const a = await createEquipment({ name: 'A' });
    const b = await createEquipment({ name: 'B' });
    const inactive = await createEquipment({ name: 'Inativo' });
    await prisma.equipment.update({ where: { id: inactive.id }, data: { status: 'INACTIVE' } });

    const at = (days: number, hour: number) => {
      const d = daysFromNow(days);
      d.setHours(hour, 0, 0, 0);
      return d;
    };
    await prisma.maintenance.createMany({
      data: [
        // no prazo
        { equipmentId: a.id, dueDate: at(-20, 8), status: 'DONE', concludedAt: at(-20, 15) },
        // 3 dias de atraso
        { equipmentId: a.id, dueDate: at(-15, 8), status: 'DONE', concludedAt: at(-12, 10) },
        // vencida e não feita
        { equipmentId: b.id, dueDate: at(-5, 8) },
        // futura: não entra
        { equipmentId: b.id, dueDate: at(10, 8) },
        // corretiva: não entra no cumprimento
        { equipmentId: b.id, kind: 'CORRECTIVE', dueDate: at(-6, 8) },
      ],
    });
    await prisma.downtime.createMany({
      data: [
        { equipmentId: a.id, startedAt: at(-13, 8), endedAt: at(-13, 12), cause: 'MECHANICAL', description: 'x', preventiveOverdue: true },
        { equipmentId: b.id, startedAt: at(-3, 8), endedAt: at(-3, 10), cause: 'ELECTRICAL', description: 'y', preventiveOverdue: true },
        { equipmentId: b.id, startedAt: at(-8, 8), endedAt: at(-8, 9), cause: 'OTHER', description: 'z', preventiveOverdue: false },
      ],
    });

    const s = await service.summary();

    expect(s.equipmentCount).toBe(2);
    expect(s.compliance).toEqual({ due: 3, onTime: 1, rate: 0.3333 });
    expect(s.avgDelayDays).toBe(1.5); // (0 + 3) / 2
    expect(s.downtime).toMatchObject({
      count: 3,
      withOverduePreventive: 2,
      withPreventiveOnTime: 1,
      totalMinutes: 420,
      mttrMinutes: 140,
    });
    expect(s.downtime.availability).toBeGreaterThan(0.99);
  });

  it('série mensal do histórico de demonstração mostra a tese: paradas concentradas em preventiva vencida', async () => {
    await runSeed(prisma, { log: () => undefined });

    const series = await service.monthly(6);
    expect(series).toHaveLength(6);

    const total = series.reduce((sum, m) => sum + m.downtimes, 0);
    const overdue = series.reduce((sum, m) => sum + m.withOverduePreventive, 0);
    expect(total).toBeGreaterThan(3);
    expect(overdue / total).toBeGreaterThan(0.6);

    const rates = series.map((m) => m.complianceRate).filter((r): r is number => r !== null);
    expect(rates.length).toBeGreaterThanOrEqual(5);
    for (const r of rates) {
      expect(r).toBeGreaterThan(0.4);
      expect(r).toBeLessThanOrEqual(1);
    }
  });

  it('o seed gera sempre o mesmo histórico (determinístico) e o cenário da demonstração', async () => {
    const count = async () => ({
      maintenances: await prisma.maintenance.count(),
      downtimes: await prisma.downtime.count(),
    });
    await runSeed(prisma, { reset: true, log: () => undefined });
    const first = await count();
    await runSeed(prisma, { reset: true, log: () => undefined });
    expect(await count()).toEqual(first);

    const overdue = await prisma.maintenance.findMany({
      where: { kind: 'PREVENTIVE', status: 'SCHEDULED', dueDate: { lt: daysFromNow(-1) } },
      include: { equipment: true },
    });
    expect(overdue.map((m) => m.equipment.name).sort()).toEqual([
      'Motor Auxiliar Linha 2',
      'Painel Elétrico Principal',
    ]);
    expect(await prisma.downtime.count({ where: { endedAt: null } })).toBe(0);
  });
});
