import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EquipmentType } from '@prisma/client';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto';
import { SettingsService } from '../settings/settings.service';

export const CHECKLIST_BY_TYPE: Record<EquipmentType, string[]> = {
  MOTOR: ['Temperatura ok', 'Ruído ok', 'Lubrificação realizada'],
  COMPRESSOR: ['Filtro verificado', 'Vazamentos checados', 'Pressão ok'],
  PUMP: ['Vazamento checado', 'Vibração ok', 'Vedação ok'],
  CONVEYOR: ['Alinhamento ok', 'Tensão ok', 'Motor ok'],
  PANEL: ['Limpeza realizada', 'Aperto de conexões', 'Aquecimento checado'],
};

@Injectable()
export class MaintenanceService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SettingsService))
    private settingsService: SettingsService,
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
      },
    });

    if (!maintenance) {
      throw new NotFoundException(`Manutenção com ID ${id} não encontrada`);
    }

    return maintenance;
  }

  async complete(id: string, completeDto: CompleteMaintenanceDto) {
    const maintenance = await this.findOne(id);

    if (maintenance.status === 'DONE') {
      throw new Error('Esta manutenção já foi concluída');
    }

    const concludedAt = completeDto.concludedAt
      ? new Date(completeDto.concludedAt)
      : new Date();

    const updatedMaintenance = await this.prisma.maintenance.update({
      where: { id },
      data: {
        status: 'DONE',
        concludedAt,
        checklist: completeDto.checklist,
        observations: completeDto.observations,
      },
      include: {
        equipment: true,
      },
    });

    const frequencyDays = await this.settingsService.getFrequencyByType(
      maintenance.equipment.type,
    );
    const nextDueDate = new Date(concludedAt);
    nextDueDate.setDate(nextDueDate.getDate() + frequencyDays);

    await this.prisma.maintenance.create({
      data: {
        equipmentId: maintenance.equipmentId,
        dueDate: nextDueDate,
        status: 'SCHEDULED',
      },
    });

    return updatedMaintenance;
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
    const [upcoming, overdue, completedThisMonth] = await Promise.all([
      this.countUpcoming(3),
      this.countOverdue(),
      this.countCompletedThisMonth(),
    ]);

    return {
      upcoming,
      overdue,
      completedThisMonth,
    };
  }
}
