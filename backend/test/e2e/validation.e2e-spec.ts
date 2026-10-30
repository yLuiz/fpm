import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, login } from '../utils/app';
import { prisma, resetDb, createUser } from '../utils/db';

describe('Parâmetros inválidos respondem 400 (e não 500 com detalhes internos)', () => {
  let app: INestApplication;
  let token: string;
  const api = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDb();
    await createUser('ADMIN', 'admin@test.com');
    token = await login(app, 'admin@test.com');
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('status desconhecido na lista de equipamentos', async () => {
    await api().get('/equipment?status=FOO').set(auth()).expect(400);
    await api().get('/equipment?status=ACTIVE').set(auth()).expect(200);
  });

  it('days fora do intervalo em upcoming', async () => {
    await api().get('/maintenance/upcoming?days=-1').set(auth()).expect(400);
    await api().get('/maintenance/upcoming?days=99999999999').set(auth()).expect(400);
    await api().get('/maintenance/upcoming?days=7').set(auth()).expect(200);
  });

  it('tipo de equipamento desconhecido em checklist e configurações', async () => {
    await api().get('/maintenance/checklist/FOO').set(auth()).expect(400);
    await api().put('/settings/frequency/conveyor').set(auth()).send({ frequencyDays: 10 }).expect(400);
    await api().put('/settings/frequency/CONVEYOR').set(auth()).send({ frequencyDays: 10 }).expect(200);
  });
});
