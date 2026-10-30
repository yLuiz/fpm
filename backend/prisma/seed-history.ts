import { Criticality, DowntimeCause, EquipmentType, PrismaClient } from '@prisma/client';
import { CHECKLIST_BY_TYPE, CORRECTIVE_DUE_DAYS } from '../src/maintenance/checklist';

const DAY = 24 * 60 * 60 * 1000;

/** PRNG determinístico (mulberry32): a demonstração gera sempre o mesmo histórico. */
export function createRandom(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOK_NOTES: Record<EquipmentType, string[]> = {
  MOTOR: ['Temperatura acima de 85 °C na carcaça', 'Ruído no rolamento traseiro', 'Graxa ressecada'],
  COMPRESSOR: ['Filtro de ar saturado', 'Vazamento na conexão do reservatório', 'Pressão abaixo de 6 bar'],
  PUMP: ['Gotejamento no selo mecânico', 'Vibração acima do normal', 'Vedação ressecada'],
  CONVEYOR: ['Correia desalinhada', 'Correia frouxa', 'Motor da esteira aquecendo'],
  PANEL: ['Poeira acumulada nos contatores', 'Borne com conexão frouxa', 'Ponto quente no disjuntor geral'],
};

const DOWNTIME_TEXT: Record<EquipmentType, [DowntimeCause, string][]> = {
  MOTOR: [['MECHANICAL', 'Rolamento travou'], ['ELECTRICAL', 'Proteção térmica desarmou']],
  COMPRESSOR: [['MECHANICAL', 'Válvula de alívio travada'], ['ELECTRICAL', 'Pressostato falhou']],
  PUMP: [['MECHANICAL', 'Selo mecânico rompeu'], ['OPERATIONAL', 'Bomba operou a seco']],
  CONVEYOR: [['MECHANICAL', 'Correia rompeu'], ['OPERATIONAL', 'Material enroscado no rolo']],
  PANEL: [['ELECTRICAL', 'Disjuntor geral desarmou'], ['ELECTRICAL', 'Contator queimado']],
};

function at(date: Date, hour: number) {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY);
}

interface HistoryEquipment {
  id: string;
  type: EquipmentType;
  criticality: Criticality;
}

/**
 * Gera ~6 meses de operação para um equipamento: preventivas concluídas
 * (≈80% no prazo), itens "Não OK" com corretivas, e paradas — mais prováveis
 * quando a preventiva está atrasada, que é a tese do produto.
 * Termina com a próxima preventiva agendada (pode estar vencida, a vencer ou futura).
 */
export async function seedEquipmentHistory(
  prisma: PrismaClient,
  equipment: HistoryEquipment,
  frequencyDays: number,
  random: () => number,
  now = new Date(),
  /** Força a próxima preventiva para hoje + N dias (cenário da demonstração) */
  nextDueInDays?: number,
) {
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
  const checklistItems = CHECKLIST_BY_TYPE[equipment.type];
  const start = addDays(now, -180);
  // Desloca o ciclo de cada equipamento para as datas não coincidirem
  let dueDate = at(addDays(start, Math.floor(random() * frequencyDays)), 8);

  while (true) {
    const late = random() < 0.2;
    const concludedAt = late
      ? at(addDays(dueDate, 2 + Math.floor(random() * 9)), 10)
      : at(addDays(dueDate, -Math.floor(random() * 2)), 10 + Math.floor(random() * 6));
    if (concludedAt >= now) break;

    const nokItem = random() < 0.12 ? pick(checklistItems) : null;
    const checklist = checklistItems.map((item) =>
      item === nokItem
        ? { item, result: 'NOK', note: pick(NOK_NOTES[equipment.type]) }
        : { item, result: 'OK' },
    );

    const preventive = await prisma.maintenance.create({
      data: {
        equipmentId: equipment.id,
        dueDate,
        status: 'DONE',
        concludedAt,
        checklist,
        observations: late ? 'Executada com atraso (equipe alocada em outra frente)' : null,
        createdAt: addDays(dueDate, -frequencyDays),
      },
    });

    if (nokItem) {
      const note = checklist.find((c) => c.item === nokItem)!.note;
      const correctiveDue = addDays(concludedAt, CORRECTIVE_DUE_DAYS[equipment.criticality]);
      const correctiveDone = addDays(concludedAt, 1);
      await prisma.maintenance.create({
        data: {
          equipmentId: equipment.id,
          kind: 'CORRECTIVE',
          originId: preventive.id,
          dueDate: correctiveDue,
          description: `Itens não conformes na preventiva:\n- ${nokItem}: ${note}`,
          ...(correctiveDone < now
            ? { status: 'DONE', concludedAt: correctiveDone, observations: 'Item corrigido e testado' }
            : {}),
        },
      });
    }

    // Paradas: 60% dos atrasos geram parada dentro da janela de atraso; 4% mesmo em dia
    const failsWhileLate = late && random() < 0.6;
    const failsOnTime = !late && random() < 0.04;
    if (failsWhileLate || failsOnTime) {
      const startedAt = failsWhileLate
        ? at(addDays(dueDate, 1 + Math.floor(random() * Math.max(1, (concludedAt.getTime() - dueDate.getTime()) / DAY - 1))), 7 + Math.floor(random() * 10))
        : at(addDays(dueDate, Math.floor(frequencyDays / 2)), 9 + Math.floor(random() * 8));
      const endedAt = new Date(startedAt.getTime() + (1 + random() * 7) * 60 * 60 * 1000);
      if (endedAt < now) {
        const [cause, description] = pick(DOWNTIME_TEXT[equipment.type]);
        const corrective = await prisma.maintenance.create({
          data: {
            equipmentId: equipment.id,
            kind: 'CORRECTIVE',
            dueDate: addDays(startedAt, CORRECTIVE_DUE_DAYS[equipment.criticality]),
            description: `Parada: ${description}`,
            status: 'DONE',
            concludedAt: endedAt,
            observations: 'Reparo realizado e equipamento liberado',
          },
        });
        await prisma.downtime.create({
          data: {
            equipmentId: equipment.id,
            startedAt,
            endedAt,
            cause,
            description,
            preventiveOverdue: failsWhileLate,
            correctiveId: corrective.id,
          },
        });
      }
    }

    dueDate = at(addDays(concludedAt, frequencyDays), 8);
  }

  // Próxima preventiva agendada
  if (nextDueInDays !== undefined) dueDate = at(addDays(now, nextDueInDays), 8);
  await prisma.maintenance.create({ data: { equipmentId: equipment.id, dueDate } });
}
