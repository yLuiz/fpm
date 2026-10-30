import { PrismaClient, EquipmentType, Criticality, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export const prisma = new PrismaClient();

/** Limpa todas as tabelas de domínio do banco de teste. */
export async function resetDb() {
  const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export const PASSWORD = 'secret123';

export async function createUser(role: UserRole = 'ADMIN', email = `${role.toLowerCase()}@test.com`) {
  return prisma.user.create({
    data: { email, name: `Teste ${role}`, role, password: await bcrypt.hash(PASSWORD, 4) },
  });
}

export async function createEquipment(
  data: Partial<{ name: string; type: EquipmentType; location: string; criticality: Criticality }> = {},
) {
  return prisma.equipment.create({
    data: {
      name: data.name ?? 'Motor Teste',
      type: data.type ?? 'MOTOR',
      location: data.location ?? 'Galpão Teste',
      criticality: data.criticality ?? 'HIGH',
    },
  });
}

export function daysFromNow(days: number, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
