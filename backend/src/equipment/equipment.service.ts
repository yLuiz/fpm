import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditAction } from '../audit/audit.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { EquipmentStatus } from '@prisma/client';

@Injectable()
export class EquipmentService {
  constructor(
    private prisma: PrismaService,
    private maintenanceService: MaintenanceService,
    private auditService: AuditService,
  ) {}

  async create(createEquipmentDto: CreateEquipmentDto, userId?: string) {
    const equipment = await this.prisma.equipment.create({
      data: createEquipmentDto,
    });

    await this.maintenanceService.createInitialMaintenance(equipment.id, equipment.type);

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.CREATE,
      entity: 'Equipment',
      entityId: equipment.id,
      newValue: equipment,
    });

    return equipment;
  }

  async findAll(status?: EquipmentStatus) {
    const where: any = { deletedAt: null };
    if (status) {
      where.status = status;
    }

    return this.prisma.equipment.findMany({
      where,
      include: {
        maintenances: {
          where: {
            status: 'SCHEDULED',
            deletedAt: null,
          },
          orderBy: {
            dueDate: 'asc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        maintenances: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            dueDate: 'desc',
          },
        },
      },
    });

    if (!equipment) {
      throw new NotFoundException(`Equipamento com ID ${id} não encontrado`);
    }

    return equipment;
  }

  async update(id: string, updateEquipmentDto: UpdateEquipmentDto, userId?: string) {
    const oldEquipment = await this.findOne(id);

    const equipment = await this.prisma.equipment.update({
      where: { id },
      data: updateEquipmentDto,
    });

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'Equipment',
      entityId: equipment.id,
      oldValue: oldEquipment,
      newValue: equipment,
    });

    return equipment;
  }

  async toggleStatus(id: string, userId?: string) {
    const equipment = await this.findOne(id);
    const newStatus = equipment.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const updated = await this.prisma.equipment.update({
      where: { id },
      data: { status: newStatus },
    });

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'Equipment',
      entityId: id,
      oldValue: { status: equipment.status },
      newValue: { status: newStatus },
    });

    return updated;
  }

  async remove(id: string, userId?: string) {
    const equipment = await this.findOne(id);

    // Soft delete - set deletedAt instead of actually deleting
    await this.prisma.equipment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Also soft delete related maintenances
    await this.prisma.maintenance.updateMany({
      where: { equipmentId: id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.DELETE,
      entity: 'Equipment',
      entityId: id,
      oldValue: equipment,
    });

    return { message: 'Equipamento removido com sucesso' };
  }

  async count() {
    return this.prisma.equipment.count({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
  }
}
