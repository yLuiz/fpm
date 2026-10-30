import { correctiveFromDowntime, downtimeMinutes, wasPreventiveOverdue } from './downtime.rules';

const at = new Date('2026-06-15T10:00:00');

describe('wasPreventiveOverdue', () => {
  it('verdadeiro com preventiva de prazo anterior ainda agendada', () => {
    expect(
      wasPreventiveOverdue([{ dueDate: new Date('2026-06-10T12:00:00'), status: 'SCHEDULED', concludedAt: null }], at),
    ).toBe(true);
  });

  it('verdadeiro se a preventiva vencida só foi concluída depois da parada', () => {
    expect(
      wasPreventiveOverdue(
        [{ dueDate: new Date('2026-06-10T12:00:00'), status: 'DONE', concludedAt: new Date('2026-06-16T09:00:00') }],
        at,
      ),
    ).toBe(true);
  });

  it('falso se a preventiva vencida foi concluída antes da parada', () => {
    expect(
      wasPreventiveOverdue(
        [{ dueDate: new Date('2026-06-10T12:00:00'), status: 'DONE', concludedAt: new Date('2026-06-12T09:00:00') }],
        at,
      ),
    ).toBe(false);
  });

  it('prazo no próprio dia da parada ainda não conta como vencida', () => {
    expect(
      wasPreventiveOverdue([{ dueDate: new Date('2026-06-15T08:00:00'), status: 'SCHEDULED', concludedAt: null }], at),
    ).toBe(false);
  });

  it('falso sem preventivas', () => {
    expect(wasPreventiveOverdue([], at)).toBe(false);
  });
});

describe('downtimeMinutes', () => {
  it('calcula a duração de parada encerrada', () => {
    expect(downtimeMinutes(new Date('2026-01-01T08:00:00Z'), new Date('2026-01-01T10:30:00Z'))).toBe(150);
  });

  it('parada aberta conta até agora', () => {
    expect(
      downtimeMinutes(new Date('2026-01-01T08:00:00Z'), null, new Date('2026-01-01T08:45:00Z')),
    ).toBe(45);
  });
});

it('descrição da corretiva aberta pela parada', () => {
  expect(correctiveFromDowntime('ELECTRICAL', 'Disjuntor desarmou')).toBe(
    'Parada (elétrica): Disjuntor desarmou',
  );
});
