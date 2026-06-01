import { PrismaClient, EquipmentType, Criticality } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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

async function main() {
  console.log('Starting seed...');

  // Clear existing data (in correct order due to foreign keys)
  console.log('Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.frequencySettings.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared existing data');

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
  console.log(`Created admin user: ${admin.email}`);

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
  console.log(`Created regular user: ${user.email}`);

  // Create frequency settings
  for (const [type, days] of Object.entries(DEFAULT_FREQUENCIES)) {
    await prisma.frequencySettings.create({
      data: {
        equipmentType: type as EquipmentType,
        frequencyDays: days,
      },
    });
  }
  console.log('Created frequency settings');

  // Create equipment and initial maintenances
  for (const equipmentData of EQUIPMENT_DATA) {
    const equipment = await prisma.equipment.create({
      data: equipmentData,
    });

    const frequencyDays = DEFAULT_FREQUENCIES[equipment.type];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + frequencyDays);

    // Create some variety in due dates for demo purposes
    const randomOffset = Math.floor(Math.random() * 10) - 5; // -5 to +5 days
    dueDate.setDate(dueDate.getDate() + randomOffset);

    await prisma.maintenance.create({
      data: {
        equipmentId: equipment.id,
        dueDate,
        status: 'SCHEDULED',
      },
    });

    console.log(`Created equipment: ${equipment.name} with initial maintenance`);
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

  console.log('Seed completed successfully!');
  console.log('');
  console.log('=================================');
  console.log('Credenciais de acesso:');
  console.log('=================================');
  console.log('Admin: admin@fpm.com / admin123');
  console.log('User:  user@fpm.com / user123');
  console.log('=================================');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
