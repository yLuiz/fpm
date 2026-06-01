import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EquipmentType } from '@prisma/client';
import { UpdateFrequencyDto } from './dto/update-frequency.dto';

export const DEFAULT_FREQUENCIES: Record<EquipmentType, number> = {
  MOTOR: 30,
  COMPRESSOR: 15,
  PUMP: 30,
  CONVEYOR: 15,
  PANEL: 60,
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAllFrequencies() {
    const settings = await this.prisma.frequencySettings.findMany();

    const frequencies = Object.values(EquipmentType).map((type) => {
      const setting = settings.find((s) => s.equipmentType === type);
      return {
        equipmentType: type,
        frequencyDays: setting?.frequencyDays ?? DEFAULT_FREQUENCIES[type],
      };
    });

    return frequencies;
  }

  async getFrequencyByType(type: EquipmentType): Promise<number> {
    const setting = await this.prisma.frequencySettings.findUnique({
      where: { equipmentType: type },
    });

    return setting?.frequencyDays ?? DEFAULT_FREQUENCIES[type];
  }

  async updateFrequency(type: EquipmentType, updateDto: UpdateFrequencyDto) {
    return this.prisma.frequencySettings.upsert({
      where: { equipmentType: type },
      update: { frequencyDays: updateDto.frequencyDays },
      create: {
        equipmentType: type,
        frequencyDays: updateDto.frequencyDays,
      },
    });
  }

  async initializeDefaultFrequencies() {
    const existingSettings = await this.prisma.frequencySettings.findMany();

    for (const [type, days] of Object.entries(DEFAULT_FREQUENCIES)) {
      const exists = existingSettings.some((s) => s.equipmentType === type);
      if (!exists) {
        await this.prisma.frequencySettings.create({
          data: {
            equipmentType: type as EquipmentType,
            frequencyDays: days,
          },
        });
      }
    }
  }
}
