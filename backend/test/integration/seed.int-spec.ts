import { runSeed } from '../../prisma/seed';
import { prisma, resetDb } from '../utils/db';

const silent = () => undefined;

describe('Seed (integração)', () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it('popula um banco vazio', async () => {
    const result = await runSeed(prisma, { log: silent });

    expect(result.skipped).toBe(false);
    expect(await prisma.user.count()).toBe(2);
    expect(await prisma.equipment.count()).toBe(10);
    expect(await prisma.frequencySettings.count()).toBe(5);
  });

  it('não apaga nem duplica dados quando o banco já está populado', async () => {
    await runSeed(prisma, { log: silent });
    const extra = await prisma.equipment.create({
      data: { name: 'Criado pelo usuário', type: 'PUMP', location: 'X', criticality: 'LOW' },
    });

    const result = await runSeed(prisma, { log: silent });

    expect(result.skipped).toBe(true);
    expect(await prisma.equipment.count()).toBe(11);
    expect(await prisma.equipment.findUnique({ where: { id: extra.id } })).not.toBeNull();
  });

  it('recria tudo com reset', async () => {
    await runSeed(prisma, { log: silent });
    await prisma.equipment.create({
      data: { name: 'Será apagado', type: 'PUMP', location: 'X', criticality: 'LOW' },
    });

    const result = await runSeed(prisma, { reset: true, log: silent });

    expect(result.skipped).toBe(false);
    expect(await prisma.equipment.count({ where: { name: 'Será apagado' } })).toBe(0);
    expect(await prisma.user.count()).toBe(2);
  });
});
