import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../utils/app';

describe('CORS (acesso pelo IP da rede, ex.: QR Code no celular)', () => {
  let app: INestApplication;
  const original = process.env.CORS_ORIGINS;

  afterEach(async () => {
    await app?.close();
    if (original === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = original;
  });

  it('sem CORS_ORIGINS aceita a origem da rede local', async () => {
    delete process.env.CORS_ORIGINS;
    app = await createTestApp();

    const res = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'http://192.168.0.10:5173')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://192.168.0.10:5173');
  });

  it('com CORS_ORIGINS aceita só as origens listadas', async () => {
    process.env.CORS_ORIGINS = 'http://fabrica.local:5173, http://localhost:5173';
    app = await createTestApp();

    const allowed = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'http://fabrica.local:5173')
      .set('Access-Control-Request-Method', 'POST');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://fabrica.local:5173');

    const denied = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'http://outro.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
