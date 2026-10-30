import { PrismaClient, EquipmentType, Criticality } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createRandom, seedEquipmentHistory } from './seed-history';

const DEFAULT_FREQUENCIES: Record<EquipmentType, number> = {
  MOTOR: 30,
  COMPRESSOR: 15,
  PUMP: 30,
  CONVEYOR: 15,
  PANEL: 60,
};

const EQUIPMENT_DATA = [
  {
    name: 'Motor Principal Linha 1',
    type: EquipmentType.MOTOR,
    location: 'Galpão A - Setor 1',
    criticality: Criticality.HIGH,
  },
  {
    name: 'Motor Auxiliar Linha 2',
    type: EquipmentType.MOTOR,
    location: 'Galpão A - Setor 2',
    criticality: Criticality.MEDIUM,
  },
  {
    name: 'Compressor Industrial 01',
    type: EquipmentType.COMPRESSOR,
    location: 'Sala de Compressores',
    criticality: Criticality.HIGH,
  },
  {
    name: 'Compressor Backup 02',
    type: EquipmentType.COMPRESSOR,
    location: 'Sala de Compressores',
    criticality: Criticality.MEDIUM,
  },
  {
    name: 'Bomba Hidráulica Principal',
    type: EquipmentType.PUMP,
    location: 'Casa de Bombas',
    criticality: Criticality.HIGH,
  },
  {
    name: 'Bomba de Refrigeração',
    type: EquipmentType.PUMP,
    location: 'Setor de Refrigeração',
    criticality: Criticality.MEDIUM,
  },
  {
    name: 'Esteira Transportadora Linha A',
    type: EquipmentType.CONVEYOR,
    location: 'Galpão B - Linha A',
    criticality: Criticality.HIGH,
  },
  {
    name: 'Esteira Transportadora Linha B',
    type: EquipmentType.CONVEYOR,
    location: 'Galpão B - Linha B',
    criticality: Criticality.MEDIUM,
  },
  {
    name: 'Painel Elétrico Principal',
    type: EquipmentType.PANEL,
    location: 'Sala Elétrica Central',
    criticality: Criticality.HIGH,
  },
  {
    name: 'QDC Setor Administrativo',
    type: EquipmentType.PANEL,
    location: 'Prédio Administrativo',
    criticality: Criticality.LOW,
  },
];

export interface SeedOptions {
  /** Apaga os dados existentes antes de popular */
  reset?: boolean;
  log?: (message: string) => void;
}

/**
 * Popula o banco com dados de demonstração.
 * Idempotente: sem `reset`, não faz nada se o banco já tiver usuários
 * (o container roda o seed a cada start e não pode apagar dados reais).
 */
export async function runSeed(prisma: PrismaClient, options: SeedOptions = {}) {
  const log = options.log ?? console.log;

  if (!options.reset) {
    const users = await prisma.user.count();
    if (users > 0) {
      log('Banco já populado; seed ignorado (use --reset para recriar).');
      return { skipped: true };
    }
  }

  log('Starting seed...');

  // Clear existing data (in correct order due to foreign keys)
  log('Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.downtime.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.frequencySettings.deleteMany();
  await prisma.user.deleteMany();

  log('Cleared existing data');

  // Create admin user (password: admin123 - for development only!)
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@fpm.com',
      password: hashedPassword,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });
  log(`Created admin user: ${admin.email}`);

  // Create a regular user for testing
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'user@fpm.com',
      password: userPassword,
      name: 'Usuário Padrão',
      role: 'USER',
    },
  });
  log(`Created regular user: ${user.email}`);

  // Create frequency settings
  for (const [type, days] of Object.entries(DEFAULT_FREQUENCIES)) {
    await prisma.frequencySettings.create({
      data: {
        equipmentType: type as EquipmentType,
        frequencyDays: days,
      },
    });
  }
  log('Created frequency settings');

  // Cenário da demonstração: duas preventivas vencidas e uma a vencer em 2 dias
  const DEMO_NEXT_DUE: Record<string, number> = {
    'Motor Auxiliar Linha 2': -4,
    'Painel Elétrico Principal': -2,
    'Esteira Transportadora Linha B': 2,
  };

  // Create equipment with ~6 months of history (preventives, correctives, downtimes)
  const random = createRandom(42);
  const installedAt = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
  for (const equipmentData of EQUIPMENT_DATA) {
    const equipment = await prisma.equipment.create({
      data: { ...equipmentData, createdAt: installedAt },
    });

    await seedEquipmentHistory(
      prisma,
      equipment,
      DEFAULT_FREQUENCIES[equipment.type],
      random,
      new Date(),
      DEMO_NEXT_DUE[equipment.name],
    );

    log(`Created equipment: ${equipment.name} with maintenance history`);
  }

  // Create initial audit log entry
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'CREATE',
      entity: 'System',
      entityId: null,
      newValue: { message: 'Sistema inicializado com dados de seed' },
    },
  });

  log('Seed completed successfully!');
  log('');
  log('=================================');
  log('Credenciais de acesso:');
  log('=================================');
  log('Admin: admin@fpm.com / admin123');
  log('User:  user@fpm.com / user123');
  log('=================================');
  return { skipped: false };
}

if (require.main === module) {
  const prisma = new PrismaClient();
  runSeed(prisma, { reset: process.argv.includes('--reset') })
    .catch((e) => {
      console.error('Seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
