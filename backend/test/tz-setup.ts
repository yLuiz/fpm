/** Fuso fixo para os testes unitários (as regras de "fim do dia" usam o horário local). */
export default function tzSetup() {
  process.env.TZ = 'America/Sao_Paulo';
}
