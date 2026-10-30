import { EquipmentType } from '@prisma/client';
import { CHECKLIST_BY_TYPE } from '../../src/maintenance/checklist';

/** Checklist completo com todos os itens OK, exceto os informados em `nok` (item -> nota). */
export function checklistFor(type: EquipmentType, nok: Record<string, string> = {}) {
  return CHECKLIST_BY_TYPE[type].map((item) =>
    nok[item] ? { item, result: 'NOK', note: nok[item] } : { item, result: 'OK' },
  );
}
