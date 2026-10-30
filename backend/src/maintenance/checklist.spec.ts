import { BadRequestException } from '@nestjs/common';
import {
  CHECKLIST_BY_TYPE,
  correctiveDescription,
  correctiveDueDate,
  nonConformities,
  validateChecklist,
} from './checklist';

const MOTOR = CHECKLIST_BY_TYPE.MOTOR; // Temperatura ok, Ruído ok, Lubrificação realizada

function messages(fn: () => unknown): string[] {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(BadRequestException);
    const msg = (e as BadRequestException).getResponse() as { message: string | string[] };
    return ([] as string[]).concat(msg.message);
  }
  throw new Error('esperava BadRequestException');
}

describe('validateChecklist', () => {
  it('aceita todos os itens respondidos e devolve na ordem oficial', () => {
    const result = validateChecklist(MOTOR, [
      { item: 'Lubrificação realizada', result: 'OK' },
      { item: 'Temperatura ok', result: 'NA' },
      { item: 'Ruído ok', result: 'NOK', note: '  rolamento  ' },
    ]);

    expect(result).toEqual([
      { item: 'Temperatura ok', result: 'NA' },
      { item: 'Ruído ok', result: 'NOK', note: 'rolamento' },
      { item: 'Lubrificação realizada', result: 'OK' },
    ]);
  });

  it('exige checklist na preventiva', () => {
    expect(messages(() => validateChecklist(MOTOR, undefined))).toEqual([
      'O checklist da preventiva é obrigatório',
    ]);
    expect(messages(() => validateChecklist(MOTOR, []))).toHaveLength(1);
  });

  it('aponta itens sem resposta (antes aceitava 1 de 3)', () => {
    const errors = messages(() =>
      validateChecklist(MOTOR, [{ item: 'Temperatura ok', result: 'OK' }]),
    );
    expect(errors).toEqual(['Itens sem resposta: Ruído ok, Lubrificação realizada']);
  });

  it('exige nota no item Não OK', () => {
    const errors = messages(() =>
      validateChecklist(MOTOR, [
        { item: 'Temperatura ok', result: 'OK' },
        { item: 'Ruído ok', result: 'NOK', note: '   ' },
        { item: 'Lubrificação realizada', result: 'OK' },
      ]),
    );
    expect(errors).toEqual(['Descreva o problema encontrado em "Ruído ok"']);
  });

  it('rejeita itens desconhecidos e repetidos', () => {
    const errors = messages(() =>
      validateChecklist(MOTOR, [
        { item: 'Temperatura ok', result: 'OK' },
        { item: 'Temperatura ok', result: 'OK' },
        { item: 'Ruído ok', result: 'OK' },
        { item: 'Lubrificação realizada', result: 'OK' },
        { item: 'Pintura', result: 'OK' },
      ]),
    );
    expect(errors).toContain('Item repetido no checklist: "Temperatura ok"');
    expect(errors).toContain('Item desconhecido no checklist: "Pintura"');
  });
});

describe('corretiva', () => {
  it('prazo pela criticidade: alta 1 dia, média 3, baixa 7', () => {
    const base = new Date('2026-05-10T08:00:00');
    expect(correctiveDueDate(base, 'HIGH').getDate()).toBe(11);
    expect(correctiveDueDate(base, 'MEDIUM').getDate()).toBe(13);
    expect(correctiveDueDate(base, 'LOW').getDate()).toBe(17);
  });

  it('descreve os itens não conformes com as notas', () => {
    const nok = nonConformities([
      { item: 'Temperatura ok', result: 'OK' },
      { item: 'Ruído ok', result: 'NOK', note: 'rolamento' },
      { item: 'Lubrificação realizada', result: 'NOK', note: 'graxa ressecada' },
    ]);
    expect(nok).toHaveLength(2);
    expect(correctiveDescription(nok)).toBe(
      'Itens não conformes na preventiva:\n- Ruído ok: rolamento\n- Lubrificação realizada: graxa ressecada',
    );
  });
});
