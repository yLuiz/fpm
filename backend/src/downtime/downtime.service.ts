import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, AuditService } from '../audit/audit.service';
import { correctiveDueDate } from '../maintenance/checklist';
import { CreateDowntimeDto } from './dto/create-downtime.dto';
import { CloseDowntimeDto } from './dto/close-downtime.dto';
import { QueryDowntimeDto } from './dto/query-downtime.dto';
import { correctiveFromDowntime, FUTURE_TOLERANCE_MS, wasPreventiveOverdue } from './downtime.rules';

const INCLUDE = {
  equipment: { select: { id: true, name: true, type: true, location: true, criticality: true } },
  corrective: { select: { id: true, status: true, dueDate: true } },
} satisfies Prisma.DowntimeInclude;

@Injectable()
export class DowntimeService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateDowntimeDto, userId?: string) {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id: dto.equipmentId, deletedAt: null },
    });
    if (!equipment) {
      throw new NotFoundException(`Equipamento com ID ${dto.equipmentId} não encontrado`);
    }

    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
    if (startedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      throw new BadRequestException('O início da parada não pode estar no futuro');
    }

    const open = await this.prisma.downtime.findFirst({
      where: { equipmentId: equipment.id, endedAt: null, deletedAt: null },
    });
    if (open) {
      throw new ConflictException('Este equipamento já tem uma parada em andamento');
    }

    const preventives = await this.prisma.maintenance.findMany({
      where: { equipmentId: equipment.id, kind: 'PREVENTIVE', deletedAt: null, dueDate: { lt: startedAt } },
      select: { dueDate: true, status: true, concludedAt: true },
    });
    const preventiveOverdue = wasPreventiveOverdue(preventives, startedAt);
    const description = dto.description.trim();

    const downtime = await this.prisma.$transaction(async (tx) => {
      const corrective = dto.openCorrective
        ? await tx.maintenance.create({
            data: {
              equipmentId: equipment.id,
              kind: 'CORRECTIVE',
              dueDate: correctiveDueDate(startedAt, equipment.criticality),
              description: correctiveFromDowntime(dto.cause, description),
            },
          })
        : null;

      return tx.downtime.create({
        data: {
          equipmentId: equipment.id,
          startedAt,
          cause: dto.cause,
          description,
          preventiveOverdue,
          correctiveId: corrective?.id,
          createdById: userId,
        },
        include: INCLUDE,
      });
    });

    await this.auditService.log({
      userId,
      action: AuditAction.CREATE,
      entity: 'Downtime',
      entityId: downtime.id,
      newValue: downtime,
    });

    return downtime;
  }

  async close(id: string, dto: CloseDowntimeDto, userId?: string) {
    const downtime = await this.findOne(id);
    if (downtime.endedAt) {
      throw new ConflictException('Esta parada já foi encerrada');
    }

    const endedAt = dto.endedAt ? new Date(dto.endedAt) : new Date();
    if (endedAt < downtime.startedAt) {
      throw new BadRequestException('O fim da parada não pode ser anterior ao início');
    }
    if (endedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      throw new BadRequestException('O fim da parada não pode estar no futuro');
    }

    const { count } = await this.prisma.downtime.updateMany({
      where: { id, endedAt: null },
      data: { endedAt },
    });
    if (count === 0) {
      throw new ConflictException('Esta parada já foi encerrada');
    }

    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'Downtime',
      entityId: id,
      oldValue: { endedAt: null },
      newValue: { endedAt },
    });

    return this.findOne(id);
  }

  async findOne(id: string) {
    const downtime = await this.prisma.downtime.findFirst({
      where: { id, deletedAt: null },
      include: INCLUDE,
    });
    if (!downtime) {
      throw new NotFoundException(`Parada com ID ${id} não encontrada`);
    }
    return downtime;
  }

  findAll(query: QueryDowntimeDto = {}) {
    const where: Prisma.DowntimeWhereInput = {
      deletedAt: null,
      equipment: { deletedAt: null },
    };
    if (query.equipmentId) where.equipmentId = query.equipmentId;
    if (query.open === true) where.endedAt = null;
    if (query.open === false) where.endedAt = { not: null };
    // Sobreposição com o período: começou até `to` e não terminou antes de `from`
    if (query.to) where.startedAt = { lte: new Date(query.to) };
    if (query.from) {
      where.OR = [{ endedAt: null }, { endedAt: { gte: new Date(query.from) } }];
    }

    return this.prisma.downtime.findMany({
      where,
      include: INCLUDE,
      orderBy: { startedAt: 'desc' },
    });
  }
}
