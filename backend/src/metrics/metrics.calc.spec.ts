import {
  averageDelayDays,
  compliance,
  delayDays,
  downtimeIndicators,
  lastMonths,
  overlapMinutes,
} from './metrics.calc';

const d = (s: string) => new Date(s);
const period = { from: d('2026-06-01T00:00:00'), to: d('2026-06-30T23:59:59.999') };
const now = d('2026-07-10T12:00:00');

describe('compliance', () => {
  it('conta no prazo quem concluiu até o fim do dia do prazo', () => {
    const result = compliance(
      [
        { dueDate: d('2026-06-10T00:00:00'), status: 'DONE', concludedAt: d('2026-06-10T23:59:00') }, // no prazo (último minuto)
        { dueDate: d('2026-06-10T00:00:00'), status: 'DONE', concludedAt: d('2026-06-11T00:01:00') }, // atrasada
        { dueDate: d('2026-06-20T00:00:00'), status: 'SCHEDULED', concludedAt: null }, // vencida e não feita
        { dueDate: d('2026-05-20T00:00:00'), status: 'DONE', concludedAt: d('2026-05-20T10:00:00') }, // fora do período
      ],
      period,
      now,
    );
    expect(result).toEqual({ due: 3, onTime: 1, rate: 0.3333 });
  });

  it('agendada que ainda não venceu não entra na conta', () => {
    const result = compliance(
      [{ dueDate: d('2026-06-30T00:00:00'), status: 'SCHEDULED', concludedAt: null }],
      period,
      d('2026-06-30T15:00:00'),
    );
    expect(result).toEqual({ due: 0, onTime: 0, rate: null });
  });
});

describe('atraso', () => {
  it('dias de atraso arredondados para cima; no prazo = 0', () => {
    expect(delayDays({ dueDate: d('2026-06-10T00:00:00'), status: 'DONE', concludedAt: d('2026-06-10T18:00:00') })).toBe(0);
    expect(delayDays({ dueDate: d('2026-06-10T00:00:00'), status: 'DONE', concludedAt: d('2026-06-11T08:00:00') })).toBe(1);
    expect(delayDays({ dueDate: d('2026-06-10T00:00:00'), status: 'DONE', concludedAt: d('2026-06-15T08:00:00') })).toBe(5);
  });

  it('média das concluídas no período; null sem dados', () => {
    expect(
      averageDelayDays(
        [
          { dueDate: d('2026-06-10T00:00:00'), status: 'DONE', concludedAt: d('2026-06-10T10:00:00') },
          { dueDate: d('2026-06-10T00:00:00'), status: 'DONE', concludedAt: d('2026-06-14T10:00:00') },
          { dueDate: d('2026-06-10T00:00:00'), status: 'SCHEDULED', concludedAt: null },
        ],
        period,
      ),
    ).toBe(2);
    expect(averageDelayDays([], period)).toBeNull();
  });
});

describe('paradas', () => {
  it('parada que cruza a borda conta só a parte dentro do período', () => {
    expect(
      overlapMinutes(
        { startedAt: d('2026-05-31T23:00:00'), endedAt: d('2026-06-01T01:00:00'), preventiveOverdue: false },
        period,
        now,
      ),
    ).toBe(60);
  });

  it('parada aberta conta até agora', () => {
    expect(
      overlapMinutes(
        { startedAt: d('2026-06-30T23:00:00'), endedAt: null, preventiveOverdue: false },
        { from: period.from, to: d('2026-07-31T00:00:00') },
        d('2026-07-01T01:00:00'),
      ),
    ).toBe(120);
  });

  it('MTTR, MTBF, disponibilidade e separação por preventiva vencida', () => {
    // Período de 10 dias, 2 equipamentos = 28.800 min disponíveis
    const p = { from: d('2026-06-01T00:00:00'), to: d('2026-06-11T00:00:00') };
    const result = downtimeIndicators(
      [
        { startedAt: d('2026-06-02T08:00:00'), endedAt: d('2026-06-02T10:00:00'), preventiveOverdue: true }, // 120 min
        { startedAt: d('2026-06-05T08:00:00'), endedAt: d('2026-06-05T09:00:00'), preventiveOverdue: false }, // 60 min
      ],
      p,
      2,
      now,
    );
    expect(result).toEqual({
      count: 2,
      withOverduePreventive: 1,
      withPreventiveOnTime: 1,
      totalMinutes: 180,
      mttrMinutes: 90,
      mtbfHours: 238.5, // (28800 - 180) / 60 / 2
      availability: 0.9938, // 1 - 180/28800
    });
  });

  it('sem paradas: MTBF e MTTR nulos, disponibilidade 100%; sem equipamentos: nulos', () => {
    const none = downtimeIndicators([], period, 3, now);
    expect(none).toMatchObject({ count: 0, mttrMinutes: null, mtbfHours: null, availability: 1 });
    expect(downtimeIndicators([], period, 0, now).availability).toBeNull();
  });
});

describe('lastMonths', () => {
  it('gera meses de calendário com rótulo em português', () => {
    const months = lastMonths(3, d('2026-01-15T10:00:00'));
    expect(months.map((m) => m.label)).toEqual(['nov/25', 'dez/25', 'jan/26']);
    expect(months[0].from).toEqual(d('2025-11-01T00:00:00'));
    expect(months[2].to.getDate()).toBe(31);
  });
});
