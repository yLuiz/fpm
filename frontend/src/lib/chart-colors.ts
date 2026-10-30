/**
 * Cor fixa por indicador. O mesmo indicador usa sempre a mesma cor em todas as telas.
 * Valores espelham os tokens --chart-* e de status em src/index.css.
 */
export const chartColors = {
  /** Manutenções a vencer (alerta) */
  upcoming: '#EFCD07',
  /** Manutenções vencidas (falha) */
  overdue: '#A50034',
  /** Manutenções realizadas (OK) */
  done: '#689F21',
  /** Cumprimento do plano de preventivas (%) */
  compliance: '#699FFF',
  /** Paradas com preventiva vencida (falha evitável) */
  downtimeOverdue: '#A50034',
  /** Paradas com preventiva em dia */
  downtimeOnTime: '#689F21',
  /** Quantidade de equipamentos por tipo */
  equipmentCount: '#05C091',
  /** Série secundária de contagem, sempre neutra */
  count: '#49495F',
  /** Linha de referência horizontal */
  reference: '#C0C0C1',
  /** Texto, ticks e data labels */
  text: '#FFFFFF',
} as const
