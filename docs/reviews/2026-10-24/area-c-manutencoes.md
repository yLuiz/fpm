# Revisão funcional: Área C. Manutenções (2026-10-24)

- **Revisor:** área C (backend `backend/src/maintenance/*` + `MaintenanceRegister.tsx`, histórico em `EquipmentDetail.tsx`, links "Registrar")
- **Ambiente:** API `http://localhost:3001` (container `fpm-backend`, relógio em **UTC**), frontend `http://localhost:5173` (container `fpm-frontend`, roda `npm run dev`, ou seja, servidor Vite em modo dev com `React.StrictMode`). Navegador: Chromium headless (Playwright) com `timezoneId: 'America/Manaus'` (UTC-4, mesmo fuso da máquina do autor).
- **Código revisado:** o que estava no disco às 16:00 (UTC-4). `MaintenanceRegister.tsx`, `EquipmentDetail.tsx` e `Dashboard.tsx` foram modificados pela última vez entre 15:59 e 16:00, antes do início da revisão, e não mudaram durante ela.
- **Dados de teste:** 13 equipamentos `[REVIEW-C] <cenário> <TIPO>` (localização "Review C"), cada um com a 1ª manutenção gerada pelo `POST /equipment`. Todas as conclusões foram feitas só nesses registros. Um deles (`[REVIEW-C] deleted MOTOR`) foi excluído no teste. Os demais **continuam na base** como evidência e entram nos KPIs do dashboard (A vencer +2, Realizadas +9).
- **Evidências:** scripts, logs JSON e screenshots em
  `C:\Users\LUIZ\AppData\Local\Temp\claude\e--Estudos-ProjetosPessoais-Descomplica\57045645-c400-4d0a-90e7-53fb4f2bb27a\scratchpad\e2e\area-c\`
  (`tests1.mjs`/`log1.json`, `tests2.mjs`/`log2.json`, `ui.mjs`, `ui-stale.mjs`, `01..15-*.png`).
- **Frequências vigentes** (`GET /settings/frequency`): MOTOR 30, COMPRESSOR 15, PUMP 30, CONVEYOR 15, PANEL 60.

---

## Achados

### [ALTO] Conclusões simultâneas da mesma manutenção geram várias "próximas manutenções"
- **Área / camada:** C. Manutenções / Backend
- **Onde:** `backend/src/maintenance/maintenance.service.ts:120-159` (verificação de status em `:123`, `update` em `:131`, `create` em `:150`)
- **Como reproduzir:** equipamento `[REVIEW-C] race MOTOR`, manutenção `0e8757f0-…`. Disparar 3 `POST /maintenance/0e8757f0-c3f6-42f7-949a-2319eb8ed07b/complete` em paralelo, com body `{"checklist":["Temperatura ok","Ruído ok","Lubrificação realizada"]}`.
- **Esperado:** uma resposta 2xx e as outras 409, com **uma** nova manutenção `SCHEDULED`.
- **Obtido:** as 3 requisições retornaram `201`. O histórico do equipamento ficou com **3 manutenções `SCHEDULED`** (`ad749432`, `ff4e8172`, `3e2de38f`, vencendo em 2026-11-23T20:17:54.698Z/.700Z/.702Z) e 1 `DONE`. O detalhe do equipamento lista 3 linhas "Agendada" com o botão "Registrar" (screenshot `12-race-detail.png`). Cada uma conta no KPI "A vencer" quando chegar a hora, e cada uma, ao ser concluída, gera outra.
- **Causa provável:** é um *check-then-act* sem atomicidade. `findOne` lê o status, o `if (status === 'DONE')` passa nas 3 requisições e cada uma faz `update` e `create`. Não há transação, nem `update` condicional (`where: { id, status: 'SCHEDULED' }`), nem restrição única de "uma SCHEDULED por equipamento". Pode acontecer com duplo clique, retry de rede ou duas pessoas registrando ao mesmo tempo.
- **Sugestão de correção:** dentro de `prisma.$transaction`, fazer `updateMany({ where: { id, status: 'SCHEDULED', deletedAt: null }, data: … })`. Se `count === 0`, lançar `ConflictException`. Só depois criar a próxima. Opcionalmente, adicionar um índice único parcial (`equipmentId` WHERE `status='SCHEDULED' AND deletedAt IS NULL`).
- **Efeito colateral no frontend:** `EquipmentDetail.tsx:93` escolhe a "próxima manutenção" com `maintenances.find(SCHEDULED)` sobre uma lista ordenada por `dueDate desc` (`equipment.service.ts:74`). Quando há duplicatas, o card e o botão do cabeçalho apontam para a **mais distante**, e não para a mais próxima (o botão foi para `ad749432`).

### [MÉDIO] `update` e `create` da conclusão não estão numa transação
- **Área / camada:** C. Manutenções / Backend
- **Onde:** `backend/src/maintenance/maintenance.service.ts:131-156`
- **Como reproduzir:** rastreado no código. A falha parcial não foi forçada, para não derrubar o banco compartilhado.
- **Esperado:** concluir a atual e agendar a próxima de forma atômica.
- **Obtido:** são três operações independentes: `update` (marca DONE), `getFrequencyByType` e `create` (próxima). Se a 2ª ou a 3ª falhar (queda de conexão, timeout, erro de validação do Prisma), a manutenção fica `DONE`, o equipamento fica **sem nenhuma manutenção agendada** e a API devolve 500. Uma nova tentativa recebe "já concluída", então não há como recuperar pela tela.
- **Causa provável:** não usa `this.prisma.$transaction`.
- **Sugestão de correção:** buscar a frequência antes e fazer `update` + `create` em `$transaction([...])` (junto com a correção do achado anterior).

### [MÉDIO] Concluir uma manutenção já concluída retorna 500, e a tela mostra erro genérico
- **Área / camada:** C. Manutenções / Backend + Frontend
- **Onde:** `backend/src/maintenance/maintenance.service.ts:124` e `frontend/src/pages/MaintenanceRegister.tsx:86-88`
- **Como reproduzir:**
  1. API: `POST /maintenance/7d512f96-9425-4305-a954-dd6fb9e231ac/complete` (já concluída) com `{"checklist":["Temperatura ok"]}`.
  2. Tela: abrir `/maintenance/<id>/register` em duas abas, registrar na aba A e depois na aba B (`ui-stale.mjs`).
- **Esperado:** `409 Conflict` (ou 400) com a mensagem "Esta manutenção já foi concluída", exibida ao usuário.
- **Obtido:** a API responde `500 {"statusCode":500,…,"message":"Esta manutenção já foi concluída"}` e o log do servidor registra stack de erro. Na aba B, o toast diz apenas **"Erro ao registrar manutenção"** e a tela continua no formulário (screenshot `15-stale-tab-500.png`). Console: `Failed to load resource: … 500` e `Error completing maintenance: AxiosError`.
- **Causa provável:** `throw new Error(...)` em vez de uma `HttpException`. O `HttpExceptionFilter` transforma qualquer `Error` em 500. No front, o `catch` ignora `error.response.data.message`.
- **Sugestão de correção:** `throw new ConflictException('Esta manutenção já foi concluída')`. No front, exibir a mensagem do backend e, no caso de 409, recarregar a tela (que já tem o estado "já concluída").

### [MÉDIO] `concludedAt` aceita qualquer data: futuro distante e passado arbitrário (que agenda a próxima já vencida)
- **Área / camada:** C. Manutenções / Backend + Frontend
- **Onde:** `backend/src/maintenance/dto/complete-maintenance.dto.ts:10` (só `@IsDateString()`), `backend/src/maintenance/maintenance.service.ts:127-148`, `frontend/src/pages/MaintenanceRegister.tsx:188-193` (input sem `max`)
- **Como reproduzir:**
  - API: `POST /maintenance/47afa127-…/complete` com `{"checklist":[…],"concludedAt":"2030-01-01T10:00:00.000Z"}` resulta em `201`, e a próxima vence em `2030-01-31T10:00:00.000Z`.
  - Tela: em `/maintenance/0386efc8-…/register`, informar `2031-05-10T10:00` e salvar. Aparece "Manutenção registrada com sucesso", o histórico mostra "Conclusão 10/05/2031" e a próxima fica em 09/06/2031 (`09-future-saved.png`).
  - Passado: `concludedAt: "2026-09-24T02:00:00.000Z"` resulta em `201`, e a próxima vence em 2026-10-24T02:00Z, ou seja, nasce já no limite de vencida.
- **Esperado:** rejeitar conclusão no futuro (400) e limitar retroatividade, por exemplo a no máximo a data de criação da manutenção (ou alguns dias antes), avisando que a próxima ficará vencida.
- **Obtido:** aceita tudo. Uma data futura empurra o agendamento anos à frente (o equipamento some dos alertas). Uma data passada gera uma próxima manutenção vencida.
- **Causa provável:** não existe validação de intervalo no DTO nem no service, e o `<Input type="datetime-local">` não tem `max`.
- **Sugestão de correção:** validar no service com `concludedAt <= now()` (com tolerância de alguns minutos) e um limite inferior. Na UI, `max={toDateTimeLocal(new Date())}`.

### [MÉDIO] Checklist não é validado contra os itens do tipo e pode ser incompleto, vazio ou inventado
- **Área / camada:** C. Manutenções / Backend + Frontend
- **Onde:** `backend/src/maintenance/dto/complete-maintenance.dto.ts:17-19`, `backend/src/maintenance/maintenance.service.ts:136`, `frontend/src/pages/MaintenanceRegister.tsx:72-75`
- **Como reproduzir (todos retornaram `201` e a manutenção ficou `DONE`):**
  - `[REVIEW-C] fake CONVEYOR`: `{"checklist":["Item inventado","","Temperatura ok","Temperatura ok"]}`. Os itens são inventados, há string vazia, há um item de MOTOR num CONVEYOR e há duplicata. Tudo foi salvo literalmente.
  - `[REVIEW-C] uiDone MOTOR`: `{"checklist":[]}`. Concluída sem nenhum item.
  - `[REVIEW-C] partial COMPRESSOR`: `{"checklist":["Pressão ok"]}`. Concluída com 1 de 3 itens.
  - Tela: o front só exige `selectedItems.length > 0`, então com 1 de 3 itens marcados o registro é aceito.
- **Esperado:** a regra de negócio precisa ser decidida. No mínimo, os itens devem pertencer a `CHECKLIST_BY_TYPE[equipment.type]`, sem duplicatas nem vazios. Se a preventiva exige todos os itens, o backend deve rejeitar o checklist incompleto, ou então gravar quais itens **não** foram feitos (ex.: `{item, ok}`), para que "concluída" signifique algo.
- **Obtido:** qualquer array de strings é aceito e gravado. O registro "concluída" não garante que algum item do checklist foi executado.
- **Causa provável:** o DTO só valida `IsArray` + `IsString({each})`, e o service não cruza com `CHECKLIST_BY_TYPE`.
- **Sugestão de correção:** no service, comparar com o checklist do tipo (400 com a lista de itens inválidos). Adicionar `@ArrayUnique()` e `@IsNotEmpty({each:true})`. Definir e aplicar a política de checklist incompleto, com a mesma regra no front.

### [MÉDIO] Não registra quem executou a manutenção, e a conclusão não gera audit log
- **Área / camada:** C. Manutenções / Backend
- **Onde:** `backend/src/maintenance/maintenance.controller.ts:82` (sem `@Request()`), `backend/src/maintenance/maintenance.service.ts:131-140`, `backend/prisma/schema.prisma:76-96` (model `Maintenance` sem campo de usuário)
- **Como reproduzir:** concluir `[REVIEW-C] main MOTOR` com o token de `user@fpm.com`. O registro retornado e o `GET /maintenance/by-equipment/:id` não têm nenhum campo de autor (`id, equipmentId, dueDate, concludedAt, status, checklist, observations, createdAt, updatedAt, deletedAt`). `grep -i audit backend/src/maintenance` não encontra nada, ao contrário de `equipment.service.ts`, que registra audit em create/update/toggle/delete.
- **Esperado:** gravar `completedById` (FK para `User`) e um `AuditLog` de `UPDATE/Maintenance`. O histórico deveria mostrar "executada por".
- **Obtido:** a autoria da manutenção (o dado principal de rastreabilidade de uma preventiva) se perde.
- **Sugestão de correção:** migration com `completedById String?` + relação, `req.user.sub` passado do controller para o service, `auditService.log(...)` na conclusão e coluna "Responsável" no histórico.

### [MÉDIO] Limite de dia calculado em UTC no backend e no fuso local no frontend: item com data de ontem aparece em "A vencer" e fica fora de "Vencidas"
- **Área / camada:** C. Manutenções / Backend + Frontend
- **Onde:** `backend/src/maintenance/maintenance.service.ts:38-43` (`findUpcoming`), `:67-68` (`findOverdue`), `:183-207` (contagens dos KPIs), em contraste com `frontend/src/lib/format.ts:19-26` (`isOverdue`) usado em `EquipmentDetail.tsx:156,187` e `Dashboard.tsx:94`
- **Como reproduzir:** às 16:17 (UTC-4) de 24/10, deixar a manutenção de `[REVIEW-C] tz MOTOR` com `dueDate = 2026-10-24T02:00:00Z` (= 23/10 22:00 no horário local), concluindo a anterior com `concludedAt 2026-09-24T02:00Z`.
  - `GET /maintenance/overdue`: **não** contém o item. `GET /maintenance/upcoming?days=0` e `?days=3`: contém. `GET /maintenance/stats`: o item é contado em `upcoming`.
  - Dashboard: a tabela **"A vencer (3 dias)"** mostra `[REVIEW-C] tz MOTOR · 23/10/2026` em vermelho, enquanto o KPI "Vencidas" não o inclui (`11-dashboard.png`).
  - Detalhe do equipamento: "Próxima manutenção 23/10/2026 · **Vencida**" (`10-tz-detail.png`).
- **Esperado:** uma única definição de "hoje" para o sistema (fuso da fábrica, ex. `America/Manaus` ou `America/Sao_Paulo`), usada tanto na API quanto na tela.
- **Obtido:** o container roda em UTC, então `setHours(0,0,0,0)` corta o dia à meia-noite UTC (20:00 local). Entre 20:00 e 23:59 locais (e para vencimentos nesse intervalo) o sistema classifica errado: o mesmo item é "a vencer" para a API e "vencido" para a tela, ou o contrário.
- **Sugestão de correção:** definir `TZ` do backend com o fuso da planta e calcular os limites com uma lib de data com fuso (date-fns-tz/Luxon). Outra opção é gravar `dueDate` como data sem hora (`@db.Date`), já que vencimento é um conceito de dia.
- **Observação:** "vence hoje" com o horário já passado (`[REVIEW-C] today MOTOR`, due 24/10 11:00 local) aparece em **A vencer** e não em Vencidas, tanto na API quanto na tela. Isso é coerente e foi para a tabela de "passou".

### [MÉDIO] Equipamento inativo continua com manutenções nos alertas e no reagendamento
- **Área / camada:** C. Manutenções / Backend
- **Onde:** `backend/src/maintenance/maintenance.service.ts:47-55` e `:76-79` (filtro `equipment: { deletedAt: null }` sem `status`), `backend/src/equipment/equipment.service.ts:108-128` (`toggleStatus` não mexe nas manutenções)
- **Como reproduzir:** `PATCH /equipment/ef2e1e44-…/toggle-status` deixa `[REVIEW-C] inactive PANEL` em `INACTIVE`. A manutenção dele continua em `GET /maintenance/upcoming?days=36500`. Em seguida, `POST /maintenance/5bc9e685-…/complete` retorna `201` e cria a próxima (`763eb843`, 2026-12-23), que também aparece em `upcoming` com `equipment.status = "INACTIVE"`.
- **Esperado:** decidir a regra. O mais comum é que equipamento inativo não gere alerta (excluir de upcoming/overdue/stats) e não reagende, ou exigir confirmação para concluir. O Dashboard já filtra equipamentos `ACTIVE` no gráfico (`equipmentApi.getAll('ACTIVE')`), mas os KPIs e as tabelas de manutenção não, o que é incoerente.
- **Obtido:** o inativo gera alerta, pode ser concluído e é reagendado indefinidamente.
- **Sugestão de correção:** adicionar `equipment: { deletedAt: null, status: 'ACTIVE' }` nas consultas e contagens. Em `complete`, rejeitar ou não reagendar quando o equipamento estiver inativo.

### [MÉDIO] `GET /maintenance/upcoming?days=` tem validação fraca e o 500 vaza a query do Prisma
- **Área / camada:** C. Manutenções / Backend
- **Onde:** `backend/src/maintenance/maintenance.controller.ts:35`, `backend/src/maintenance/maintenance.service.ts:41-43`, `backend/src/common/filters/http-exception.filter.ts:29-31`
- **Como reproduzir / obtido:**
  | `days=` | Status | Resultado |
  |---|---|---|
  | `0` | 200 | só vencendo hoje (ok) |
  | `-5` | 200 | `[]` silencioso (intervalo invertido) |
  | `abc` | 200 | **ignora e usa o default 3** (mesmo resultado de `days=3`) |
  | *(vazio)* | 200 | default 3 |
  | `1.5` | 400 | "Validation failed (numeric string is expected)" |
  | `99999999999` | **500** | `message` traz o trecho de `/app/dist/maintenance/maintenance.service.js:49`, a query Prisma completa e `new Date("Invalid Date")` |
- **Esperado:** 400 para valor não numérico, negativo ou acima de um teto razoável (ex. 365), sem expor internals.
- **Causa provável:** o `ValidationPipe` global com `transform`/`enableImplicitConversion` converte `'abc'` em `NaN` antes do `DefaultValuePipe`, que trata `NaN` como ausente e devolve 3. Não existe `min`/`max`. O filtro global devolve `exception.message` de qualquer `Error` não-HTTP ao cliente.
- **Sugestão de correção:** DTO de query com `@Type(() => Number) @IsInt() @Min(0) @Max(365)`. No filtro, responder "Internal server error" para erros não-HTTP e logar o detalhe só no servidor. O vazamento afeta toda a API e é transversal.

### [BAIXO] Checklist registrado nunca aparece na interface
- **Área / camada:** C. Manutenções / Frontend
- **Onde:** `frontend/src/pages/EquipmentDetail.tsx:175-218` (colunas: Data prevista, Conclusão, Status, Observações, Ação)
- **Como reproduzir:** registrar uma manutenção marcando itens e abrir o detalhe do equipamento. `grep checklist frontend/src --include=*.tsx` só encontra `MaintenanceRegister.tsx`.
- **Esperado:** poder consultar quais itens foram verificados em cada manutenção (expandir a linha ou abrir um modal).
- **Obtido:** o dado é gravado (`checklist` JSON) mas não é exibido em nenhuma tela. As observações aparecem truncadas (`max-w-xs truncate`), sem como ler o texto inteiro.
- **Sugestão de correção:** linha expansível ou diálogo "Ver registro" com checklist, observações completas e responsável.

### [BAIXO] Histórico ordenado por data prevista mistura concluídas e agendadas
- **Área / camada:** C. Manutenções / Backend + Frontend
- **Onde:** `backend/src/equipment/equipment.service.ts:73-75` (`orderBy: { dueDate: 'desc' }`)
- **Como reproduzir:** `[REVIEW-C] tz MOTOR`: a linha concluída (prevista 23/11/2026, concluída 23/09) aparece **acima** da agendada (prevista 23/10/2026) (`10-tz-detail.png`).
- **Esperado:** agendada/pendente no topo e as concluídas por `concludedAt desc`.
- **Sugestão de correção:** ordenar por `status` e depois por `concludedAt desc`/`dueDate asc`, ou separar "Próxima" de "Histórico".

### [BAIXO] Data de conclusão vazia gera `RangeError` no console e toast genérico
- **Área / camada:** C. Manutenções / Frontend
- **Onde:** `frontend/src/pages/MaintenanceRegister.tsx:79`
- **Como reproduzir:** na tela de registro, marcar os itens, apagar o campo "Data/hora da conclusão" e clicar em "Registrar manutenção".
- **Obtido:** toast "Erro ao registrar manutenção". Console: `RangeError: Invalid time value at Date.toISOString … handleSubmit` (`08-empty-date.png`). Nada é enviado.
- **Esperado:** validação do campo ("Informe a data de conclusão") ou fallback para "agora" (o backend já aceita `concludedAt` ausente).
- **Sugestão de correção:** `concludedAt: concludedAt ? new Date(concludedAt).toISOString() : undefined` ou `required` no input.

### [BAIXO] Endpoints auxiliares respondem 200 para entradas inválidas
- **Área / camada:** C. Manutenções / Backend
- **Onde:** `backend/src/maintenance/maintenance.controller.ts:56-61` e `:66-68`
- **Como reproduzir / obtido:** `GET /maintenance/checklist/FOO` e `GET /maintenance/checklist/motor` retornam `200 {"type":"FOO","items":[]}`. `GET /maintenance/by-equipment/00000000-0000-0000-0000-000000000000` retorna `200 []`.
- **Esperado:** `400` para tipo fora do enum (`ParseEnumPipe(EquipmentType)`) e `404` para equipamento inexistente.

### [BAIXO] `observations` sem limite de tamanho
- **Área / camada:** C. Manutenções / Backend
- **Onde:** `backend/src/maintenance/dto/complete-maintenance.dto.ts:26`
- **Como reproduzir:** concluir `[REVIEW-C] fake CONVEYOR` com `observations` de 20.000 caracteres. Resposta `201`, gravado inteiro.
- **Sugestão de correção:** `@MaxLength(2000)` e `maxLength` no `<Textarea>`.

### [BAIXO] Pequenas inconsistências de contrato e feedback
- **Área / camada:** C. Manutenções / Backend + Frontend
- **Onde / obtido:**
  - `maintenance.controller.ts:78-80`: `POST :id/complete` responde **201**, mas o Swagger documenta 200.
  - `MaintenanceRegister.tsx:41-60`: abrir `/maintenance/<id inexistente>/register` faz **2 GETs** e mostra **2 toasts** "Erro ao carregar manutenção" (`07-register-404.png`), por causa do `React.StrictMode` em dev. O container do frontend roda `npm run dev` (`frontend/Dockerfile:13`), então é isso que o usuário vê hoje. Em build de produção sairia um toast só.
  - O valor padrão de "Data/hora da conclusão" é o horário em que a página foi aberta, e não o do envio (`MaintenanceRegister.tsx:38`), com precisão de minuto.

---

## O que foi testado e passou

| # | Item | Resultado |
|---|---|---|
| 1 | Sem token em `GET upcoming`, `GET checklist/:type`, `POST :id/complete` | `401` |
| 2 | `GET /maintenance/:id` inexistente (UUID válido e `abc`) | `404` com mensagem em PT |
| 3 | `POST /maintenance/:id/complete` com ID inexistente | `404` |
| 4 | Manutenção de equipamento **excluído** (soft delete): `GET :id` e `complete` | `404` nas duas; `by-equipment` retorna `[]` |
| 5 | Validação do DTO: sem `checklist`, checklist string, checklist numérico, `concludedAt:"abc"`, campo extra (`status`), JSON malformado | `400` com mensagem clara em todos; manutenção continua `SCHEDULED` |
| 6 | Caminho feliz (USER): conclui, grava `status DONE`, `concludedAt`, `checklist`, `observations` | `201`, dados corretos |
| 7 | Reagendamento: próxima = `concludedAt + frequência do tipo` | MOTOR +30d (`20:17:38.513Z` → `2026-11-23T20:17:38.513Z`), PUMP +30d (2030-01-01 → 2030-01-31), PANEL +60d, COMPRESSOR/CONVEYOR +15d, conferidos com `GET /settings/frequency` |
| 8 | `POST /equipment` cria a 1ª manutenção com `now + frequência` | 13/13 corretos |
| 9 | `GET checklist/MOTOR` | itens corretos do tipo |
| 10 | `upcoming?days=0` inclui o que vence hoje; `days=1.5` retorna 400 | ok |
| 11 | "Vence hoje, horário já passou" (due 24/10 11:00 local) | aparece em **A vencer** (API e tela), status "Agendada", fora de "Vencidas", coerente |
| 12 | Tela de registro: carrega dados (equipamento, tipo, local, data prevista) e checklist do tipo | ok (`02-register.png`) |
| 13 | Enviar sem item marcado | toast "Selecione pelo menos um item do checklist", sem request |
| 14 | "Marcar todos" / "Desmarcar todos" e contador "N de 3 itens selecionados"; clicar no texto do item marca o checkbox | ok |
| 15 | Salvar com sucesso | toast "Manutenção registrada com sucesso", redireciona para `/equipment/:id`, histórico mostra a concluída (com data/hora e observação) e a nova agendada (`04-after-save.png`) |
| 16 | Botão "Voltar" do navegador após salvar, ou abrir registro de manutenção já concluída | tela "Esta manutenção já foi concluída" + "Ver equipamento" (`05`, `06`) |
| 17 | Registro com ID inexistente | estado vazio "Manutenção não encontrada" + "Voltar para o Dashboard" |
| 18 | Links "Registrar": cabeçalho do detalhe, linha do histórico e tabelas do Dashboard | levam a `/maintenance/:id/register` da manutenção certa |
| 19 | Layout mobile 390px (registro e detalhe) | sem scroll horizontal (`scrollWidth = 390`) (`13`, `14`) |
| 20 | Console nas telas da área (fluxo feliz) | nenhum erro; só os avisos de *future flags* do React Router v6 |

## Não confirmado

- **Duplo clique no botão "Registrar manutenção"**: o botão é desabilitado por `saving`, mas o desabilitar depende de um re-render entre os cliques. Não consegui reproduzir de forma confiável pelo navegador. Pela API o problema de concorrência está confirmado (achado ALTO).
- **Falha parcial entre `update` e `create`**: rastreada no código e não forçada, para não derrubar o banco compartilhado.
- **Caso inverso de fuso** (entre 20:00 e 23:59 locais, quando o servidor já está "amanhã" em UTC, um vencimento de hoje à tarde iria para `overdue` na API e apareceria "Agendada" na tela): deduzido do mesmo código, mas não executado porque o teste rodou às 16h locais.
