# Correções da Revisão Funcional de 2026-10-24

> **Objetivo:** corrigir os problemas abertos no consolidado da revisão de 2026-10-24, na ordem de prioridade, com teste para cada correção.
> **Categoria:** plans · **Status:** Em andamento
> **Atualizado em:** 2026-10-29
> **Relacionados:** [Consolidado da revisão](../reviews/2026-10-24/consolidado.md) · [Decisões das funcionalidades](decisoes-funcionalidades.md)

Os números (#) são os do [consolidado](../reviews/2026-10-24/consolidado.md).

## Decisões de domínio (respondidas em 2026-10-29)

| # | Pergunta | Decisão |
|---|---|---|
| D1 | Quem gerencia equipamentos (criar, editar, desativar, excluir)? | **Só ADMIN** (#13) |
| D2 | "Realizadas (mês)" conta corretivas concluídas? | **Sim** |
| D3 | A partir de quando conta o prazo da corretiva? | **A partir do momento do registro no sistema** (não da data de conclusão informada, que segue no histórico e nos indicadores); data de conclusão não pode ser futura nem anterior à criação da manutenção (#9) |
| D4 | Equipamento inativo sai de alertas, KPIs e indicadores e bloqueia paradas/conclusões? | **Sim** (#5) |

## Etapas

### Bloco 1 — Segurança e integridade (sem dependência de decisão)
- **#2 Paradas simultâneas:** criação da parada dentro de transação com trava na linha do equipamento (`SELECT … FOR UPDATE`), serializando registros concorrentes.
- **#7 Paradas retroativas:** na mesma transação, recusar início anterior à criação do equipamento e início que se sobreponha a parada já encerrada.
- **#3 Limite de login:** aplicar o limite de 5/min no throttler nomeado que existe (`medium`); remover o `@SkipThrottle()` sem efeito do refresh.
- **#8 Erros 500:** filtro global não repassa mensagem de erros não-HTTP; validar `status`, `days` e o tipo de equipamento nos parâmetros (400 em vez de 500).

### Bloco 2 — Confiabilidade da tela (sem dependência de decisão)
- **#10** Estado de erro no dashboard.
- **#11** Mensagens de login por tipo de erro (credencial, limite de tentativas, rede).
- **#12** Remover as credenciais do admin da tela de login.
- **Regressão** da data de conclusão vazia no registro de manutenção.

### Bloco 3 — Regras de negócio (após as decisões)
- **#13** Equipamentos só para ADMIN (API e tela) — D1.
- **#5** Equipamento inativo fora de alertas, KPIs e indicadores; paradas e conclusões bloqueadas — D4.
- **#6** Denominador de MTBF/disponibilidade considera os equipamentos existentes em cada período.
- **#9** Limites da data de conclusão e prazo da corretiva — D3.
- "Realizadas (mês)" inclui corretivas — D2.

### Bloco 4 — Baixos
Agrupados por tela, depois dos blocos anteriores.

## Status de execução

- [x] **Bloco 1** (2026-10-29): #2 trava por equipamento na transação; #7 recusa sobreposição e início anterior ao cadastro; #3 limite de 5 logins/min ativo (verificado: 5×401 e 429 na 6ª); #8 filtro não repassa mensagens internas e parâmetros inválidos dão 400. Testes: unit 47, integração 15, e2e 20.
- [x] **Bloco 2** (2026-10-29): #10 estado de erro com "Tentar novamente" no dashboard; #11 mensagens de login por tipo de erro; #12 credenciais removidas da tela; regressão da data vazia corrigida. Vitest 48/48 e verificação no navegador.
- [x] **Bloco 3** (2026-10-29):
  - #13/D1: criar, editar, desativar e excluir equipamento só ADMIN (403 na API; botões e rotas escondidos para USER).
  - #5/D4: inativo fora de vencidas, a vencer, KPIs e indicadores; conclusão e parada em inativo → 409; tela não oferece parada nem registro.
  - #6: horas disponíveis somadas por equipamento a partir do cadastro; inativos fora do numerador e do denominador; disponibilidade e MTBF não ficam negativos com dados antigos.
  - #9/D3: conclusão não pode ser futura (tolerância de 5 min) nem anterior à abertura (tolerância de 1 min, porque o campo da tela não tem segundos); prazo da corretiva, do checklist ou da parada, contado do registro.
  - D2: "Realizadas (mês)" já contava corretivas; mantida como histórico do trabalho feito, inclusive de equipamento depois desativado.
  - Achado durante a execução: sem a tolerância de 1 min, quem cadastrava um equipamento e registrava parada ou manutenção no mesmo minuto era barrado (pego pela suíte Playwright).
  - Testes: backend unit 51, integração 15, e2e 23; frontend Vitest 51, Playwright 7/7.
- [ ] Bloco 4
