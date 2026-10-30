import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';

const ALL_OK = [
  { item: 'Temperatura ok', result: 'OK' },
  { item: 'Ruído ok', result: 'OK' },
  { item: 'Lubrificação realizada', result: 'OK' },
];

const WITH_NOK = [
  { item: 'Temperatura ok', result: 'OK' },
  { item: 'Ruído ok', result: 'NOK', note: 'Ruído no rolamento' },
  { item: 'Lubrificação realizada', result: 'OK' },
];

function buildService(overrides: { maintenance?: any; updateCount?: number; frequency?: number } = {}) {
  const maintenance =
    overrides.maintenance === undefined
      ? {
          id: 'm1',
          equipmentId: 'e1',
          kind: 'PREVENTIVE',
          status: 'SCHEDULED',
          dueDate: new Date('2026-01-10T12:00:00Z'),
          createdAt: new Date('2025-12-01T00:00:00Z'),
          equipment: { id: 'e1', type: 'MOTOR', criticality: 'MEDIUM', status: 'ACTIVE' },
        }
      : overrides.maintenance;

  let seq = 0;
  const tx = {
    maintenance: {
      updateMany: jest.fn().mockResolvedValue({ count: overrides.updateCount ?? 1 }),
      create: jest
        .fn()
        .mockImplementation(({ data }) => Promise.resolve({ id: `new-${++seq}`, ...data })),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ ...maintenance, status: 'DONE' }),
    },
  };
  const prisma = {
    maintenance: { findFirst: jest.fn().mockResolvedValue(maintenance) },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const settings = { getFrequencyByType: jest.fn().mockResolvedValue(overrides.frequency ?? 30) };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };

  const service = new MaintenanceService(prisma as any, settings as any, audit as any);
  return { service, prisma, tx, settings, audit };
}

describe('MaintenanceService.complete', () => {
  describe('preventiva', () => {
    it('conclui e agenda a próxima em concludedAt + frequência do tipo', async () => {
      const { service, tx, settings } = buildService({ frequency: 15 });

      const result = await service.complete('m1', {
        concludedAt: '2026-01-10T10:00:00.000Z',
        checklist: ALL_OK,
      } as any);

      expect(settings.getFrequencyByType).toHaveBeenCalledWith('MOTOR');
      expect(tx.maintenance.create).toHaveBeenCalledTimes(1);
      expect(result.next?.dueDate.toISOString()).toBe('2026-01-25T10:00:00.000Z');
      expect(result.corrective).toBeNull();
      expect(tx.maintenance.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'm1', status: 'SCHEDULED', deletedAt: null } }),
      );
    });

    it('item Não OK abre corretiva com prazo pela criticidade, contado do registro (D3)', async () => {
      // inspeção feita em 10/01 e lançada no sistema em 12/01
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(new Date('2026-01-12T08:00:00Z'));
      const { service, tx } = buildService();

      const result = await service.complete('m1', {
        concludedAt: '2026-01-10T10:00:00.000Z',
        checklist: WITH_NOK,
      } as any);

      expect(tx.maintenance.create).toHaveBeenCalledTimes(2);
      expect(result.corrective).toMatchObject({
        kind: 'CORRECTIVE',
        originId: 'm1',
        equipmentId: 'e1',
      });
      expect(result.corrective?.description).toContain('Ruído ok: Ruído no rolamento');
      // criticidade MEDIUM = 3 dias a partir do registro, não da conclusão informada
      expect(result.corrective?.dueDate.toISOString()).toBe('2026-01-15T08:00:00.000Z');
      jest.useRealTimers();
    });

    it('rejeita checklist incompleto sem abrir transação', async () => {
      const { service, prisma } = buildService();
      await expect(
        service.complete('m1', { checklist: ALL_OK.slice(0, 1) } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('corretiva', () => {
    const corrective = {
      id: 'c1',
      equipmentId: 'e1',
      kind: 'CORRECTIVE',
      status: 'SCHEDULED',
      createdAt: new Date('2025-12-01T00:00:00Z'),
      equipment: { id: 'e1', type: 'MOTOR', criticality: 'HIGH', status: 'ACTIVE' },
    };

    it('exige a solução aplicada', async () => {
      const { service } = buildService({ maintenance: corrective });
      await expect(
        service.complete('c1', { observations: '   ' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('conclui sem checklist e sem gerar próxima manutenção', async () => {
      const { service, tx, settings } = buildService({ maintenance: corrective });

      const result = await service.complete('c1', { observations: 'Rolamento trocado' } as any);

      expect(tx.maintenance.create).not.toHaveBeenCalled();
      expect(settings.getFrequencyByType).not.toHaveBeenCalled();
      expect(result.next).toBeNull();
      expect(tx.maintenance.updateMany.mock.calls[0][0].data.observations).toBe('Rolamento trocado');
    });
  });

  it('rejeita conclusão em equipamento inativo (409)', async () => {
    const { service, prisma } = buildService({
      maintenance: {
        id: 'm1', kind: 'PREVENTIVE', status: 'SCHEDULED', createdAt: new Date('2025-12-01T00:00:00Z'),
        equipment: { type: 'MOTOR', criticality: 'MEDIUM', status: 'INACTIVE' },
      },
    });
    await expect(service.complete('m1', { checklist: ALL_OK } as any)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejeita data de conclusão no futuro ou anterior à abertura (400)', async () => {
    const { service, prisma } = buildService();
    const future = new Date(Date.now() + 3600_000).toISOString();
    await expect(
      service.complete('m1', { concludedAt: future, checklist: ALL_OK } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.complete('m1', { concludedAt: '2025-11-01T00:00:00.000Z', checklist: ALL_OK } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejeita com 409 manutenção já concluída', async () => {
    const { service, prisma } = buildService({
      maintenance: { id: 'm1', kind: 'PREVENTIVE', status: 'DONE', equipment: { type: 'MOTOR' } },
    });

    await expect(service.complete('m1', { checklist: ALL_OK } as any)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejeita com 409 quando outra requisição concluiu antes (corrida)', async () => {
    const { service, tx } = buildService({ updateCount: 0 });

    await expect(service.complete('m1', { checklist: ALL_OK } as any)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.maintenance.create).not.toHaveBeenCalled();
  });

  it('retorna 404 para manutenção inexistente', async () => {
    const { service } = buildService({ maintenance: null });
    await expect(service.complete('x', { checklist: [] } as any)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('registra a conclusão na auditoria com o usuário', async () => {
    const { service, audit } = buildService();
    await service.complete('m1', { checklist: ALL_OK } as any, 'user-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', entity: 'Maintenance', entityId: 'm1' }),
    );
  });
});
