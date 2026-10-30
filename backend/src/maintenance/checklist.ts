import { BadRequestException } from '@nestjs/common';
import { Criticality, EquipmentType } from '@prisma/client';

export const CHECKLIST_BY_TYPE: Record<EquipmentType, string[]> = {
  MOTOR: ['Temperatura ok', 'Ruído ok', 'Lubrificação realizada'],
  COMPRESSOR: ['Filtro verificado', 'Vazamentos checados', 'Pressão ok'],
  PUMP: ['Vazamento checado', 'Vibração ok', 'Vedação ok'],
  CONVEYOR: ['Alinhamento ok', 'Tensão ok', 'Motor ok'],
  PANEL: ['Limpeza realizada', 'Aperto de conexões', 'Aquecimento checado'],
};

export const CHECKLIST_RESULTS = ['OK', 'NOK', 'NA'] as const;
export type ChecklistResultValue = (typeof CHECKLIST_RESULTS)[number];

export interface ChecklistResult {
  item: string;
  result: ChecklistResultValue;
  note?: string;
}

/** Prazo (dias) para atender uma corretiva, pela criticidade do equipamento. */
export const CORRECTIVE_DUE_DAYS: Record<Criticality, number> = {
  HIGH: 1,
  MEDIUM: 3,
  LOW: 7,
};

/**
 * Valida o checklist de uma preventiva: todo item do tipo respondido uma única vez,
 * sem itens desconhecidos, e "Não OK" sempre com nota.
 * Retorna os resultados na ordem do checklist oficial, com notas aparadas.
 */
export function validateChecklist(expected: string[], results: ChecklistResult[] | undefined) {
  if (!results || results.length === 0) {
    throw new BadRequestException('O checklist da preventiva é obrigatório');
  }

  const errors: string[] = [];
  const byItem = new Map<string, ChecklistResult>();

  for (const r of results) {
    if (!expected.includes(r.item)) errors.push(`Item desconhecido no checklist: "${r.item}"`);
    else if (byItem.has(r.item)) errors.push(`Item repetido no checklist: "${r.item}"`);
    else byItem.set(r.item, r);

    if (r.result === 'NOK' && !r.note?.trim()) {
      errors.push(`Descreva o problema encontrado em "${r.item}"`);
    }
  }

  const missing = expected.filter((item) => !byItem.has(item));
  if (missing.length > 0) errors.push(`Itens sem resposta: ${missing.join(', ')}`);

  if (errors.length > 0) throw new BadRequestException(errors);

  return expected.map((item) => {
    const r = byItem.get(item)!;
    const note = r.note?.trim();
    return note ? { item, result: r.result, note } : { item, result: r.result };
  });
}

export function nonConformities(results: ChecklistResult[]) {
  return results.filter((r) => r.result === 'NOK');
}

/** Texto da corretiva aberta a partir dos itens "Não OK". */
export function correctiveDescription(nok: ChecklistResult[]) {
  return ['Itens não conformes na preventiva:', ...nok.map((r) => `- ${r.item}: ${r.note}`)].join('\n');
}

export function correctiveDueDate(from: Date, criticality: Criticality) {
  const due = new Date(from);
  due.setDate(due.getDate() + CORRECTIVE_DUE_DAYS[criticality]);
  return due;
}
