import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, login } from '../utils/app';
import { prisma, resetDb, createUser, createEquipment, daysFromNow } from '../utils/db';

describe('Paradas (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const api = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDb();
    await createUser('USER', 'tecnico@test.com');
    token = await login(app, 'tecnico@test.com');
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('exige autenticação', async () => {
    await api().get('/downtime').expect(401);
  });

  it('ciclo completo: registrar, equipamento "parado", conflito, encerrar', async () => {
    const eq = await createEquipment({ criticality: 'HIGH' });
    await prisma.maintenance.create({ data: { equipmentId: eq.id, dueDate: daysFromNow(-3) } });

    const created = await api()
      .post('/downtime')
      .set(auth())
      .send({ equipmentId: eq.id, cause: 'MECHANICAL', description: 'Motor travou', openCorrective: true })
      .expect(201);
    expect(created.body).toMatchObject({ preventiveOverdue: true, endedAt: null });
    expect(created.body.corrective.id).toBeDefined();

    const detail = await api().get(`/equipment/${eq.id}`).set(auth()).expect(200);
    expect(detail.body.downtimes).toHaveLength(1);
    const list = await api().get('/equipment').set(auth()).expect(200);
    expect(list.body[0].downtimes).toHaveLength(1);

    await api()
      .post('/downtime')
      .set(auth())
      .send({ equipmentId: eq.id, cause: 'OTHER', description: 'de novo' })
      .expect(409);

    const open = await api().get('/downtime?open=true').set(auth()).expect(200);
    expect(open.body).toHaveLength(1);

    const closed = await api().patch(`/downtime/${created.body.id}/close`).set(auth()).send({}).expect(200);
    expect(closed.body.endedAt).not.toBeNull();
    await api().patch(`/downtime/${created.body.id}/close`).set(auth()).send({}).expect(409);

    expect((await api().get('/downtime?open=true').set(auth())).body).toHaveLength(0);
    expect((await api().get('/downtime?open=false').set(auth())).body).toHaveLength(1);
    const after = await api().get(`/equipment/${eq.id}`).set(auth()).expect(200);
    expect(after.body.downtimes).toHaveLength(0);
  });

  it('valida entrada', async () => {
    const eq = await createEquipment();
    await api().post('/downtime').set(auth()).send({ equipmentId: eq.id, cause: 'FOGO', description: 'x' }).expect(400);
    await api().post('/downtime').set(auth()).send({ equipmentId: eq.id, cause: 'OTHER', description: '' }).expect(400);
    await api()
      .post('/downtime')
      .set(auth())
      .send({ equipmentId: '00000000-0000-4000-8000-000000000000', cause: 'OTHER', description: 'x' })
      .expect(404);
    await api().get('/downtime?open=talvez').set(auth()).expect(400);
  });
});
