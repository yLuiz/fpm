import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EquipmentType } from '@prisma/client';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto';
import { SettingsService } from '../settings/settings.service';
import { AuditService, AuditAction } from '../audit/audit.service';
import {
  CHECKLIST_BY_TYPE,
  correctiveDescription,
  correctiveDueDate,
  nonConformities,
  validateChecklist,
} from './checklist';

@Injectable()
export class MaintenanceService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SettingsService))
    private settingsService: SettingsService,
    private auditService: AuditService,
  ) {}

  async createInitialMaintenance(equipmentId: string, equipmentType: EquipmentType) {
    const frequencyDays = await this.settingsService.getFrequencyByType(equipmentType);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + frequencyDays);

    return this.prisma.maintenance.create({
      data: {
        equipmentId,
        dueDate,
        status: 'SCHEDULED',
      },
    });
  }

  async findUpcoming(days: number = 3) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    futureDate.setHours(23, 59, 59, 999);

    return this.prisma.maintenance.findMany({
      where: {
        status: 'SCHEDULED',
        deletedAt: null,
        dueDate: {
          gte: today,
          lte: futureDate,
        },
        equipment: {
          deletedAt: null,
        },
      },
      include: {
        equipment: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }

  async findOverdue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.maintenance.findMany({
      where: {
        status: 'SCHEDULED',
        deletedAt: null,
        dueDate: {
          lt: today,
        },
        equipment: {
          deletedAt: null,
        },
      },
      include: {
        equipment: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }

  async findByEquipment(equipmentId: string) {
    return this.prisma.maintenance.findMany({
      where: {
        equipmentId,
        deletedAt: null,
      },
      orderBy: {
        dueDate: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const maintenance = await this.prisma.maintenance.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        equipment: true,
        origin: { select: { id: true, dueDate: true, concludedAt: true, checklist: true } },
        correctives: {
          where: { deletedAt: null },
          select: { id: true, status: true, dueDate: true, concludedAt: true },
        },
      },
    });

    if (!maintenance) {
      throw new NotFoundException(`Manutenção com ID ${id} não encontrada`);
    }

    return maintenance;
  }

  /**
   * Conclui uma manutenção.
   * - Preventiva: exige o checklist completo, agenda a próxima e, se houver itens
   *   "Não OK", abre uma corretiva com prazo pela criticidade do equipamento.
   * - Corretiva: exige a solução aplicada (observations) e não gera próxima.
   */
  async complete(id: string, completeDto: CompleteMaintenanceDto, userId?: string) {
    const maintenance = await this.findOne(id);

    if (maintenance.status === 'DONE') {
      throw new ConflictException('Esta manutenção já foi concluída');
    }

    const concludedAt = completeDto.concludedAt
      ? new Date(completeDto.concludedAt)
      : new Date();
    const observations = completeDto.observations?.trim() || undefined;

    let checklist: ReturnType<typeof validateChecklist> | undefined;
    let nextDueDate: Date | undefined;
    if (maintenance.kind === 'PREVENTIVE') {
      checklist = validateChecklist(
        CHECKLIST_BY_TYPE[maintenance.equipment.type],
        completeDto.checklist,
      );
      const frequencyDays = await this.settingsService.getFrequencyByType(
        maintenance.equipment.type,
      );
      nextDueDate = new Date(concludedAt);
      nextDueDate.setDate(nextDueDate.getDate() + frequencyDays);
    } else if (!observations) {
      throw new BadRequestException('Descreva a solução aplicada na corretiva');
    }
    const nok = checklist ? nonConformities(checklist) : [];

    // Conclusão, próxima preventiva e corretiva são atômicas; o filtro por status
    // impede que dois envios simultâneos gerem registros duplicados.
    const result = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.maintenance.updateMany({
        where: { id, status: 'SCHEDULED', deletedAt: null },
        data: { status: 'DONE', concludedAt, checklist, observations },
      });
      if (count === 0) {
        throw new ConflictException('Esta manutenção já foi concluída');
      }

      const next = nextDueDate
        ? await tx.maintenance.create({
            data: { equipmentId: maintenance.equipmentId, dueDate: nextDueDate },
          })
        : null;

      const corrective =
        nok.length > 0
          ? await tx.maintenance.create({
              data: {
                equipmentId: maintenance.equipmentId,
                kind: 'CORRECTIVE',
                originId: id,
                dueDate: correctiveDueDate(concludedAt, maintenance.equipment.criticality),
                description: correctiveDescription(nok),
              },
            })
          : null;

      const updated = await tx.maintenance.findUniqueOrThrow({
        where: { id },
        include: { equipment: true },
      });
      return { maintenance: updated, next, corrective };
    });

    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'Maintenance',
      entityId: id,
      oldValue: { status: maintenance.status },
      newValue: {
        status: 'DONE',
        kind: maintenance.kind,
        concludedAt,
        checklist,
        nextId: result.next?.id,
        correctiveId: result.corrective?.id,
      },
    });

    return result;
  }

  async getChecklist(equipmentType: EquipmentType) {
    return CHECKLIST_BY_TYPE[equipmentType] || [];
  }

  async countCompletedThisMonth() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return this.prisma.maintenance.count({
      where: {
        status: 'DONE',
        deletedAt: null,
        concludedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });
  }

  async countUpcoming(days: number = 3) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    futureDate.setHours(23, 59, 59, 999);

    return this.prisma.maintenance.count({
      where: {
        status: 'SCHEDULED',
        deletedAt: null,
        dueDate: {
          gte: today,
          lte: futureDate,
        },
        equipment: {
          deletedAt: null,
        },
      },
    });
  }

  async countOverdue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.maintenance.count({
      where: {
        status: 'SCHEDULED',
        deletedAt: null,
        dueDate: {
          lt: today,
        },
        equipment: {
          deletedAt: null,
        },
      },
    });
  }

  async getDashboardStats() {
    const [upcoming, overdue, completedThisMonth, openCorrectives] = await Promise.all([
      this.countUpcoming(3),
      this.countOverdue(),
      this.countCompletedThisMonth(),
      this.prisma.maintenance.count({
        where: {
          kind: 'CORRECTIVE',
          status: 'SCHEDULED',
          deletedAt: null,
          equipment: { deletedAt: null },
        },
      }),
    ]);

    return {
      upcoming,
      overdue,
      completedThisMonth,
      openCorrectives,
    };
  }
}
