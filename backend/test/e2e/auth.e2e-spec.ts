import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../utils/app';
import { prisma, resetDb, createUser, PASSWORD } from '../utils/db';

describe('Autenticação: refresh token (e2e)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  const doLogin = async () => {
    const res = await api()
      .post('/auth/login')
      .send({ email: 'tecnico@test.com', password: PASSWORD })
      .expect(201);
    return res.body as { access_token: string; refresh_token: string };
  };
  const refresh = (refresh_token: string) => api().post('/auth/refresh').send({ refresh_token });

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDb();
    await createUser('USER', 'tecnico@test.com');
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('renova a sessão e devolve um novo par de tokens que funciona', async () => {
    const { refresh_token } = await doLogin();

    const res = await refresh(refresh_token).expect(201);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).not.toBe(refresh_token);

    await api().get('/auth/me').set('Authorization', `Bearer ${res.body.access_token}`).expect(200);
  });

  it('rejeita um refresh token já usado (rotação)', async () => {
    const { refresh_token } = await doLogin();
    const first = await refresh(refresh_token).expect(201);

    await refresh(refresh_token).expect(401);
    // o token novo continua válido
    await refresh(first.body.refresh_token).expect(201);
  });

  it('só uma de duas renovações simultâneas com o mesmo token é aceita', async () => {
    const { refresh_token } = await doLogin();

    const results = await Promise.all([refresh(refresh_token), refresh(refresh_token)]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 401]);
  });

  it('logout invalida o refresh token, inclusive depois de um novo login', async () => {
    const { access_token, refresh_token } = await doLogin();
    await api().post('/auth/logout').set('Authorization', `Bearer ${access_token}`).expect(201);

    await refresh(refresh_token).expect(401);

    await doLogin();
    await refresh(refresh_token).expect(401);
  });

  it('rejeita token malformado', async () => {
    await refresh('nao-e-um-jwt').expect(401);
  });
});
