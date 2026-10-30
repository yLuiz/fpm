import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, login } from '../utils/app';
import { prisma, resetDb, createUser, createEquipment, daysFromNow } from '../utils/db';
import { checklistFor } from '../utils/checklist';

describe('Manutenção (e2e)', () => {
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

  async function overduePreventive() {
    const equipment = await createEquipment({ type: 'MOTOR', criticality: 'HIGH' });
    const m = await prisma.maintenance.create({
      data: { equipmentId: equipment.id, dueDate: daysFromNow(-2) },
    });
    return { equipment, m };
  }

  it('exige autenticação', async () => {
    await api().get('/maintenance/overdue').expect(401);
  });

  it('conclui uma vez (201) e recusa a segunda conclusão (409)', async () => {
    const { equipment, m } = await overduePreventive();

    const overdue = await api().get('/maintenance/overdue').set(auth()).expect(200);
    expect(overdue.body.map((x: any) => x.id)).toContain(m.id);

    const done = await api()
      .post(`/maintenance/${m.id}/complete`)
      .set(auth())
      .send({ checklist: checklistFor('MOTOR') })
      .expect(201);
    expect(done.body.maintenance.status).toBe('DONE');
    expect(done.body.next.kind).toBe('PREVENTIVE');
    expect(done.body.corrective).toBeNull();

    const again = await api()
      .post(`/maintenance/${m.id}/complete`)
      .set(auth())
      .send({ checklist: checklistFor('MOTOR') })
      .expect(409);
    expect(again.body.message).toMatch(/já foi concluída/);

    const history = await api().get(`/maintenance/by-equipment/${equipment.id}`).set(auth()).expect(200);
    expect(history.body).toHaveLength(2);
  });

  it('valida o checklist: incompleto, resultado inválido e NOK sem nota (400)', async () => {
    const { m } = await overduePreventive();

    const incomplete = await api()
      .post(`/maintenance/${m.id}/complete`)
      .set(auth())
      .send({ checklist: [{ item: 'Temperatura ok', result: 'OK' }] })
      .expect(400);
    expect(incomplete.body.message).toEqual(['Itens sem resposta: Ruído ok, Lubrificação realizada']);

    await api()
      .post(`/maintenance/${m.id}/complete`)
      .set(auth())
      .send({ checklist: [{ item: 'Temperatura ok', result: 'TALVEZ' }] })
      .expect(400);

    await api()
      .post(`/maintenance/${m.id}/complete`)
      .set(auth())
      .send({
        checklist: checklistFor('MOTOR').map((c) =>
          c.item === 'Ruído ok' ? { item: c.item, result: 'NOK' } : c,
        ),
      })
      .expect(400);

    // Formato antigo (lista de textos) não é mais aceito
    await api()
      .post(`/maintenance/${m.id}/complete`)
      .set(auth())
      .send({ checklist: ['Temperatura ok'] })
      .expect(400);
  });

  it('fluxo NOK: preventiva abre corretiva, que aparece nas listas e é concluída com a solução', async () => {
    const { m } = await overduePreventive();

    const done = await api()
      .post(`/maintenance/${m.id}/complete`)
      .set(auth())
      .send({ checklist: checklistFor('MOTOR', { 'Ruído ok': 'Ruído no rolamento' }) })
      .expect(201);
    const corrective = done.body.corrective;
    expect(corrective).toMatchObject({ kind: 'CORRECTIVE', originId: m.id, status: 'SCHEDULED' });

    // Criticidade alta = 1 dia: entra em "a vencer"
    const upcoming = await api().get('/maintenance/upcoming?days=3').set(auth()).expect(200);
    expect(upcoming.body.find((x: any) => x.id === corrective.id)?.kind).toBe('CORRECTIVE');

    const stats = await api().get('/maintenance/stats').set(auth()).expect(200);
    expect(stats.body.openCorrectives).toBe(1);

    const detail = await api().get(`/maintenance/${corrective.id}`).set(auth()).expect(200);
    expect(detail.body.origin.id).toBe(m.id);
    expect(detail.body.description).toContain('Ruído no rolamento');

    await api().post(`/maintenance/${corrective.id}/complete`).set(auth()).send({}).expect(400);
    const closed = await api()
      .post(`/maintenance/${corrective.id}/complete`)
      .set(auth())
      .send({ observations: 'Rolamento substituído' })
      .expect(201);
    expect(closed.body.next).toBeNull();

    const after = await api().get('/maintenance/stats').set(auth()).expect(200);
    expect(after.body.openCorrectives).toBe(0);
  });
});
