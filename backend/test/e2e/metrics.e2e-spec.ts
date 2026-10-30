import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, login } from '../utils/app';
import { prisma, resetDb, createUser, createEquipment, daysFromNow } from '../utils/db';

describe('Indicadores (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const api = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDb();
    await createUser('USER', 'gestor@test.com');
    token = await login(app, 'gestor@test.com');
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('exige autenticação', async () => {
    await api().get('/metrics/summary').expect(401);
    await api().get('/metrics/monthly').expect(401);
  });

  it('parada registrada pela API aparece nos indicadores', async () => {
    const eq = await createEquipment();
    await prisma.maintenance.create({ data: { equipmentId: eq.id, dueDate: daysFromNow(-4) } });

    const d = await api()
      .post('/downtime')
      .set(auth())
      .send({ equipmentId: eq.id, cause: 'MECHANICAL', description: 'Travou', startedAt: daysFromNow(-1).toISOString() })
      .expect(201);
    await api().patch(`/downtime/${d.body.id}/close`).set(auth()).send({}).expect(200);

    const summary = await api().get('/metrics/summary').set(auth()).expect(200);
    expect(summary.body.downtime).toMatchObject({ count: 1, withOverduePreventive: 1 });
    expect(summary.body.downtime.mttrMinutes).toBeGreaterThan(0);
    expect(summary.body.compliance).toEqual({ due: 1, onTime: 0, rate: 0 });

    const monthly = await api().get('/metrics/monthly?months=3').set(auth()).expect(200);
    expect(monthly.body).toHaveLength(3);
    const total = monthly.body.reduce((s: number, m: any) => s + m.downtimes, 0);
    expect(total).toBe(1);
    expect(monthly.body[2]).toHaveProperty('label');
  });

  it('valida os parâmetros', async () => {
    await api().get('/metrics/monthly?months=13').set(auth()).expect(400);
    await api().get('/metrics/monthly?months=0').set(auth()).expect(400);
    await api().get('/metrics/summary?from=ontem').set(auth()).expect(400);
    await api()
      .get('/metrics/summary?from=2026-02-01T00:00:00Z&to=2026-01-01T00:00:00Z')
      .set(auth())
      .expect(400);
  });
});
