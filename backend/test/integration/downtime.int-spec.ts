import { DowntimeService } from '../../src/downtime/downtime.service';
import { AuditService } from '../../src/audit/audit.service';
import { prisma, resetDb, createEquipment, daysFromNow } from '../utils/db';

describe('Paradas (integração com banco)', () => {
  const service = new DowntimeService(prisma as any, new AuditService(prisma as any));

  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it('grava se havia preventiva vencida no momento da parada', async () => {
    const late = await createEquipment({ name: 'Atrasado' });
    await prisma.maintenance.create({ data: { equipmentId: late.id, dueDate: daysFromNow(-5) } });
    const ok = await createEquipment({ name: 'Em dia' });
    await prisma.maintenance.create({ data: { equipmentId: ok.id, dueDate: daysFromNow(10) } });

    const a = await service.create({ equipmentId: late.id, cause: 'MECHANICAL', description: 'x' });
    const b = await service.create({ equipmentId: ok.id, cause: 'ELECTRICAL', description: 'y' });

    expect(a.preventiveOverdue).toBe(true);
    expect(b.preventiveOverdue).toBe(false);
    expect(a.equipment.name).toBe('Atrasado');
  });

  it('abre corretiva vinculada, encerra a parada e libera nova parada', async () => {
    const eq = await createEquipment({ criticality: 'HIGH' });

    const d = await service.create({
      equipmentId: eq.id,
      cause: 'MECHANICAL',
      description: 'Eixo travado',
      openCorrective: true,
    });
    expect(d.corrective).toMatchObject({ status: 'SCHEDULED' });
    const corrective = await prisma.maintenance.findUniqueOrThrow({ where: { id: d.correctiveId! } });
    expect(corrective).toMatchObject({ kind: 'CORRECTIVE', equipmentId: eq.id });
    expect(corrective.description).toBe('Parada (mecânica): Eixo travado');

    await expect(
      service.create({ equipmentId: eq.id, cause: 'OTHER', description: 'dup' }),
    ).rejects.toThrow('parada em andamento');

    const closed = await service.close(d.id, {});
    expect(closed.endedAt).not.toBeNull();

    await expect(
      service.create({ equipmentId: eq.id, cause: 'OTHER', description: 'nova' }),
    ).resolves.toBeDefined();
    expect(await prisma.auditLog.count({ where: { entity: 'Downtime' } })).toBe(3);
  });

  it('registros simultâneos no mesmo equipamento abrem uma única parada', async () => {
    const eq = await createEquipment();

    const results = await Promise.allSettled(
      [1, 2, 3].map(() =>
        service.create({ equipmentId: eq.id, cause: 'MECHANICAL', description: 'x', openCorrective: true }),
      ),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.downtime.count({ where: { equipmentId: eq.id } })).toBe(1);
    expect(await prisma.maintenance.count({ where: { equipmentId: eq.id, kind: 'CORRECTIVE' } })).toBe(1);
  });

  it('recusa parada retroativa sobreposta a outra já encerrada', async () => {
    const eq = await prisma.equipment.update({
      where: { id: (await createEquipment()).id },
      data: { createdAt: daysFromNow(-30) },
    });
    await prisma.downtime.create({
      data: { equipmentId: eq.id, startedAt: daysFromNow(-10), endedAt: daysFromNow(-8), cause: 'MECHANICAL', description: 'a' },
    });

    await expect(
      service.create({ equipmentId: eq.id, cause: 'OTHER', description: 'b', startedAt: daysFromNow(-9).toISOString() }),
    ).rejects.toThrow('sobrepõe');
    await expect(
      service.create({ equipmentId: eq.id, cause: 'OTHER', description: 'c', startedAt: daysFromNow(-40).toISOString() }),
    ).rejects.toThrow('cadastro do equipamento');
    await expect(
      service.create({ equipmentId: eq.id, cause: 'OTHER', description: 'd', startedAt: daysFromNow(-5).toISOString() }),
    ).resolves.toBeDefined();
  });

  it('filtra por em andamento, equipamento e período (sobreposição)', async () => {
    const eq1 = await createEquipment({ name: 'Eq1' });
    const eq2 = await createEquipment({ name: 'Eq2' });
    // Encerrada no passado (dias -20 a -19)
    await prisma.downtime.create({
      data: {
        equipmentId: eq1.id,
        startedAt: daysFromNow(-20),
        endedAt: daysFromNow(-19),
        cause: 'MECHANICAL',
        description: 'antiga',
      },
    });
    // Aberta desde ontem
    await prisma.downtime.create({
      data: { equipmentId: eq2.id, startedAt: daysFromNow(-1), cause: 'ELECTRICAL', description: 'aberta' },
    });

    expect((await service.findAll({ open: true })).map((d) => d.description)).toEqual(['aberta']);
    expect((await service.findAll({ open: false })).map((d) => d.description)).toEqual(['antiga']);
    expect((await service.findAll({ equipmentId: eq1.id })).map((d) => d.description)).toEqual(['antiga']);
    expect(
      (await service.findAll({ from: daysFromNow(-7).toISOString() })).map((d) => d.description),
    ).toEqual(['aberta']);
    expect(
      (await service.findAll({ from: daysFromNow(-30).toISOString(), to: daysFromNow(-10).toISOString() })).map(
        (d) => d.description,
      ),
    ).toEqual(['antiga']);
  });
});
