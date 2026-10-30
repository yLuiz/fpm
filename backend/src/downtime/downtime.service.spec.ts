import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DowntimeService } from './downtime.service';

function build(
  opts: { equipment?: any; open?: any; overlap?: any; preventives?: any[]; downtime?: any; updateCount?: number } = {},
) {
  const equipment =
    opts.equipment === undefined
      ? { id: 'e1', criticality: 'MEDIUM', status: 'ACTIVE', deletedAt: null, createdAt: new Date('2000-01-01') }
      : opts.equipment;
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    maintenance: { create: jest.fn().mockImplementation(({ data }) => ({ id: 'c1', ...data })) },
    downtime: {
      // endedAt: null → parada em andamento; endedAt: { gt } → sobreposição com parada encerrada
      findFirst: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(where.endedAt === null ? (opts.open ?? null) : (opts.overlap ?? null)),
      ),
      create: jest.fn().mockImplementation(({ data }) => ({ id: 'd1', ...data })),
    },
  };
  const prisma = {
    equipment: { findFirst: jest.fn().mockResolvedValue(equipment) },
    downtime: {
      findFirst: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(where.id ? (opts.downtime ?? null) : (opts.open ?? null)),
      ),
      updateMany: jest.fn().mockResolvedValue({ count: opts.updateCount ?? 1 }),
    },
    maintenance: { findMany: jest.fn().mockResolvedValue(opts.preventives ?? []) },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const audit = { log: jest.fn() };
  return { service: new DowntimeService(prisma as any, audit as any), prisma, tx, audit };
}

const dto = { equipmentId: 'e1', cause: 'MECHANICAL', description: ' Travou ' } as any;

describe('DowntimeService.create', () => {
  it('registra a parada com o snapshot de preventiva vencida', async () => {
    const { service, tx } = build({
      preventives: [{ dueDate: new Date('2020-01-01'), status: 'SCHEDULED', concludedAt: null }],
    });

    await service.create(dto, 'u1');

    expect(tx.downtime.create.mock.calls[0][0].data).toMatchObject({
      equipmentId: 'e1',
      description: 'Travou',
      preventiveOverdue: true,
      createdById: 'u1',
      correctiveId: undefined,
    });
    expect(tx.maintenance.create).not.toHaveBeenCalled();
  });

  it('abre corretiva vinculada quando pedido, com prazo contado do registro (D3)', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(new Date('2026-01-12T08:00:00Z'));
    const { service, tx } = build();
    await service.create({ ...dto, openCorrective: true, startedAt: '2026-01-10T10:00:00.000Z' });

    const corrective = tx.maintenance.create.mock.calls[0][0].data;
    expect(corrective).toMatchObject({ kind: 'CORRECTIVE', description: 'Parada (mecânica): Travou' });
    expect(corrective.dueDate.toISOString()).toBe('2026-01-15T08:00:00.000Z'); // MEDIUM = 3 dias do registro
    jest.useRealTimers();
    expect(tx.downtime.create.mock.calls[0][0].data.correctiveId).toBe('c1');
  });

  it('trava o equipamento antes de verificar a parada em andamento', async () => {
    const { service, tx } = build();
    await service.create(dto);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.downtime.findFirst.mock.invocationCallOrder[0],
    );
  });

  it('recusa segunda parada aberta no mesmo equipamento (409)', async () => {
    const { service, tx } = build({ open: { id: 'd0' } });
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.downtime.create).not.toHaveBeenCalled();
  });

  it('recusa início sobreposto a parada já encerrada (409)', async () => {
    const { service, tx } = build({ overlap: { id: 'd0' } });
    await expect(service.create({ ...dto, startedAt: '2026-01-10T10:00:00.000Z' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.downtime.create).not.toHaveBeenCalled();
  });

  it('recusa início anterior ao cadastro do equipamento (400)', async () => {
    const { service } = build({
      equipment: { id: 'e1', criticality: 'MEDIUM', status: 'ACTIVE', deletedAt: null, createdAt: new Date('2026-01-10') },
    });
    await expect(service.create({ ...dto, startedAt: '2026-01-01T10:00:00.000Z' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('recusa parada em equipamento inativo (409)', async () => {
    const { service, tx } = build({
      equipment: { id: 'e1', criticality: 'MEDIUM', status: 'INACTIVE', deletedAt: null, createdAt: new Date('2000-01-01') },
    });
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.downtime.create).not.toHaveBeenCalled();
  });

  it('recusa início no futuro (400) e equipamento inexistente (404)', async () => {
    await expect(
      build().service.create({ ...dto, startedAt: new Date(Date.now() + 3600_000).toISOString() }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(build({ equipment: null }).service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('DowntimeService.close', () => {
  const open = { id: 'd1', startedAt: new Date('2026-01-10T08:00:00Z'), endedAt: null };

  it('encerra com a data informada', async () => {
    const { service, prisma } = build({ downtime: open });
    await service.close('d1', { endedAt: '2026-01-10T09:00:00.000Z' });
    expect(prisma.downtime.updateMany).toHaveBeenCalledWith({
      where: { id: 'd1', endedAt: null },
      data: { endedAt: new Date('2026-01-10T09:00:00.000Z') },
    });
  });

  it('recusa fim anterior ao início (400) e parada já encerrada (409)', async () => {
    await expect(
      build({ downtime: open }).service.close('d1', { endedAt: '2026-01-10T07:00:00.000Z' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      build({ downtime: { ...open, endedAt: new Date() } }).service.close('d1', {}),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(build({ downtime: open, updateCount: 0 }).service.close('d1', {})).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
