import { ConflictException } from '@nestjs/common';
import { MaintenanceService } from '../../src/maintenance/maintenance.service';
import { SettingsService } from '../../src/settings/settings.service';
import { AuditService } from '../../src/audit/audit.service';
import { prisma, resetDb, createEquipment, daysFromNow } from '../utils/db';
import { checklistFor } from '../utils/checklist';

describe('Conclusão de manutenção (integração com banco)', () => {
  const settings = new SettingsService(prisma as any);
  const audit = new AuditService(prisma as any);
  const service = new MaintenanceService(prisma as any, settings, audit);

  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  async function scheduled(criticality: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH') {
    const equipment = await createEquipment({ type: 'COMPRESSOR', criticality });
    await prisma.frequencySettings.create({ data: { equipmentType: 'COMPRESSOR', frequencyDays: 15 } });
    const m = await prisma.maintenance.create({
      data: { equipmentId: equipment.id, dueDate: daysFromNow(1) },
    });
    return { equipment, m };
  }

  it('marca como DONE, grava o resultado do checklist e cria a próxima com a frequência configurada', async () => {
    const { equipment, m } = await scheduled();
    const concludedAt = new Date('2026-03-01T10:00:00.000Z');

    await service.complete(m.id, {
      concludedAt: concludedAt.toISOString(),
      checklist: checklistFor('COMPRESSOR'),
    } as any);

    const all = await prisma.maintenance.findMany({ where: { equipmentId: equipment.id } });
    expect(all).toHaveLength(2);
    const done = all.find((x) => x.id === m.id)!;
    expect(done.status).toBe('DONE');
    expect(done.checklist).toEqual(checklistFor('COMPRESSOR'));
    const next = all.find((x) => x.id !== m.id)!;
    expect(next).toMatchObject({ status: 'SCHEDULED', kind: 'PREVENTIVE' });
    expect(next.dueDate.toISOString()).toBe('2026-03-16T10:00:00.000Z');
    expect(await prisma.auditLog.count({ where: { entity: 'Maintenance' } })).toBe(1);
  });

  it('item Não OK abre corretiva vinculada; concluir a corretiva não gera nova preventiva', async () => {
    const { equipment, m } = await scheduled('LOW');
    const concludedAt = new Date('2026-03-01T10:00:00.000Z');

    const { corrective } = await service.complete(m.id, {
      concludedAt: concludedAt.toISOString(),
      checklist: checklistFor('COMPRESSOR', { 'Pressão ok': 'Pressão abaixo de 6 bar' }),
    } as any);

    expect(corrective).not.toBeNull();
    const saved = await prisma.maintenance.findUniqueOrThrow({
      where: { id: corrective!.id },
      include: { origin: true },
    });
    expect(saved).toMatchObject({ kind: 'CORRECTIVE', status: 'SCHEDULED', originId: m.id });
    expect(saved.description).toContain('Pressão ok: Pressão abaixo de 6 bar');
    expect(saved.dueDate.toISOString()).toBe('2026-03-08T10:00:00.000Z'); // LOW = 7 dias

    const before = await prisma.maintenance.count({ where: { equipmentId: equipment.id } });
    const done = await service.complete(corrective!.id, { observations: 'Regulador ajustado' } as any);
    expect(done.next).toBeNull();
    expect(await prisma.maintenance.count({ where: { equipmentId: equipment.id } })).toBe(before);

    const origin = await service.findOne(m.id);
    expect(origin.correctives).toEqual([
      expect.objectContaining({ id: corrective!.id, status: 'DONE' }),
    ]);
  });

  it('duas conclusões simultâneas geram uma única próxima manutenção', async () => {
    const { equipment, m } = await scheduled();

    const results = await Promise.allSettled([
      service.complete(m.id, { checklist: checklistFor('COMPRESSOR') } as any),
      service.complete(m.id, { checklist: checklistFor('COMPRESSOR') } as any),
    ]);

    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    expect(
      await prisma.maintenance.count({ where: { equipmentId: equipment.id, status: 'SCHEDULED' } }),
    ).toBe(1);
  });

  it('estatísticas contam corretivas abertas', async () => {
    const { m } = await scheduled();
    await service.complete(m.id, {
      checklist: checklistFor('COMPRESSOR', { 'Filtro verificado': 'Filtro saturado' }),
    } as any);

    const stats = await service.getDashboardStats();
    expect(stats.openCorrectives).toBe(1);
  });
});
