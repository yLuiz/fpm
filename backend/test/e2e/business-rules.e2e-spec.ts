import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, login } from '../utils/app';
import { prisma, resetDb, createUser, createEquipment, daysFromNow } from '../utils/db';
import { CHECKLIST_BY_TYPE } from '../../src/maintenance/checklist';

describe('Regras de negócio da revisão de 2026-10-24 (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let user: string;
  const api = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDb();
    await createUser('ADMIN', 'admin@test.com');
    await createUser('USER', 'tecnico@test.com');
    admin = await login(app, 'admin@test.com');
    user = await login(app, 'tecnico@test.com');
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('D1: só o administrador cria, edita, desativa e exclui equipamentos', async () => {
    const body = { name: 'Motor X', type: 'MOTOR', location: 'Galpão', criticality: 'LOW' };
    await api().post('/equipment').set(as(user)).send(body).expect(403);
    const created = await api().post('/equipment').set(as(admin)).send(body).expect(201);
    const id = created.body.id;

    await api().patch(`/equipment/${id}`).set(as(user)).send({ name: 'Y' }).expect(403);
    await api().patch(`/equipment/${id}/toggle-status`).set(as(user)).expect(403);
    await api().delete(`/equipment/${id}`).set(as(user)).expect(403);

    // técnico continua consultando
    await api().get(`/equipment/${id}`).set(as(user)).expect(200);
    await api().get('/equipment').set(as(user)).expect(200);
  });

  it('D4: equipamento inativo sai das pendências e bloqueia conclusão e parada', async () => {
    const eq = await createEquipment();
    const overdue = await prisma.maintenance.create({
      data: { equipmentId: eq.id, dueDate: daysFromNow(-2), createdAt: daysFromNow(-30) },
    });

    let stats = await api().get('/maintenance/stats').set(as(admin)).expect(200);
    expect(stats.body.overdue).toBe(1);

    await api().patch(`/equipment/${eq.id}/toggle-status`).set(as(admin)).expect(200);

    stats = await api().get('/maintenance/stats').set(as(admin)).expect(200);
    expect(stats.body.overdue).toBe(0);
    const list = await api().get('/maintenance/overdue').set(as(admin)).expect(200);
    expect(list.body).toHaveLength(0);

    const checklist = CHECKLIST_BY_TYPE.MOTOR.map((item) => ({ item, result: 'OK' }));
    await api().post(`/maintenance/${overdue.id}/complete`).set(as(user)).send({ checklist }).expect(409);
    await api()
      .post('/downtime')
      .set(as(user))
      .send({ equipmentId: eq.id, cause: 'MECHANICAL', description: 'x' })
      .expect(409);
  });

  it('D3/#9: data de conclusão limitada e prazo da corretiva contado do registro', async () => {
    const eq = await createEquipment({ criticality: 'HIGH' });
    const m = await prisma.maintenance.create({
      data: { equipmentId: eq.id, dueDate: daysFromNow(-1), createdAt: daysFromNow(-20) },
    });
    const [first, ...rest] = CHECKLIST_BY_TYPE.MOTOR;
    const checklist = [
      { item: first, result: 'NOK', note: 'Aquecendo' },
      ...rest.map((item) => ({ item, result: 'OK' })),
    ];

    await api()
      .post(`/maintenance/${m.id}/complete`)
      .set(as(user))
      .send({ checklist, concludedAt: daysFromNow(2).toISOString() })
      .expect(400);
    await api()
      .post(`/maintenance/${m.id}/complete`)
      .set(as(user))
      .send({ checklist, concludedAt: daysFromNow(-25).toISOString() })
      .expect(400);

    // inspeção feita há 5 dias, lançada agora: corretiva HIGH vence em 1 dia a partir de agora
    const before = Date.now();
    const res = await api()
      .post(`/maintenance/${m.id}/complete`)
      .set(as(user))
      .send({ checklist, concludedAt: daysFromNow(-5).toISOString() })
      .expect(201);
    const due = new Date(res.body.corrective.dueDate).getTime();
    expect(due).toBeGreaterThanOrEqual(before + 24 * 3600_000 - 1000);
    expect(new Date(res.body.maintenance.concludedAt).getTime()).toBeLessThan(before);
  });
});
