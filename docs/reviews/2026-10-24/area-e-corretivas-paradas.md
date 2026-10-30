# Revisão funcional: Área E. Corretivas e Paradas (2026-10-24)

> **Objetivo:** registrar os achados verificados da revisão funcional da área E (checklist OK/NOK/NA → corretiva automática, conclusão de corretiva, paradas e status "Parado"), da API à tela.
> **Categoria:** reviews · **Status:** Concluído
> **Atualizado em:** 2026-10-24
> **Relacionados:** [Padrão de revisão funcional](../../process/padrao-revisao-funcional.md) · [Plano de funcionalidades](../../plans/plano-funcionalidades.md) · [Decisões](../../plans/decisoes-funcionalidades.md) · [Área C](area-c-manutencoes.md) · [Área D](area-d-dashboard-config.md)

- **Revisor:** área E (backend `maintenance/*` na parte de checklist/corretiva, `downtime/*`; frontend `MaintenanceRegister.tsx`, `Downtimes.tsx`, `downtime-dialogs.tsx`, status "Parado" e selo "Corretiva" em lista, detalhe e dashboard).
- **Ambiente:** API `http://localhost:3001` (Swagger já com `/downtime` e `/metrics`, ou seja, o código final), frontend `http://localhost:5173`. O teste rodou por volta de 23:00 (UTC-4), 03:00 UTC do dia 25. Navegador: Chromium headless (Playwright) com `timezoneId: 'America/Manaus'`, em 1440px e 390px, como ADMIN e como USER (token injetado no `localStorage`).
- **Dados de teste:** 11 equipamentos `[REVIEW-E] <cenário> <TIPO>` (local "Review E"). As paradas abertas foram encerradas e **os 11 foram excluídos (soft delete) no fim**. Nada ficou ativo na base. As paradas e corretivas deles continuam no banco ligadas a equipamentos excluídos, e as listagens e indicadores já filtram esses casos.
- **Evidências:** scripts, logs JSON e screenshots em
  `C:\Users\LUIZ\AppData\Local\Temp\claude\e--Estudos-ProjetosPessoais-Descomplica\57045645-c400-4d0a-90e7-53fb4f2bb27a\scratchpad\e2e\area-e\`
  (`t2.mjs` checklist/corretiva, `t3.mjs` concorrência, `t4.mjs`/`t5.mjs` paradas, `ui1.mjs`/`ui2.mjs`/`ui3.mjs` navegador, `log-*.json`, `ui*-*.log`, `*.png`).

---

## Achados

### [ALTO] Registros simultâneos de parada no mesmo equipamento criam várias paradas abertas (e várias corretivas)
- **Área / camada:** E. Corretivas e Paradas / Backend
- **Onde:** `backend/src/downtime/downtime.service.ts:41-46` (verificação) e `:55-79` (criação). O schema não tem índice único parcial (`backend/prisma/migrations/20261024204118_add_downtime/migration.sql`).
- **Como reproduzir:** 3 `POST /downtime` em paralelo no mesmo equipamento, com `{ equipmentId, cause: "MECHANICAL", description: "Race n", openCorrective: true }`.
- **Esperado:** uma resposta 201 e duas 409 ("Este equipamento já tem uma parada em andamento"), como diz a decisão 2.3.
- **Obtido:** **três respostas 201**. `GET /downtime?open=true&equipmentId=…` devolveu 3 paradas abertas, e o equipamento ficou com 3 corretivas. No dashboard, o aviso mostrou "3 equipamento(s) parado(s)" com o mesmo equipamento duas vezes (`admin-1440-07-dashboard.png`). Encerrar uma das paradas deixa o equipamento ainda "Parado". Como `downtimeIndicators` soma a duração de cada parada (`backend/src/metrics/metrics.calc.ts:87`), as horas paradas contam em dobro ou em triplo, o que distorce disponibilidade, MTBF e MTTR.
- **Causa provável:** a regra é verificada com um `findFirst` e depois um `create`, sem transação serializável e sem constraint. Na conclusão de manutenção o problema foi resolvido com `updateMany where status`, mas aqui não existe nada parecido.
- **Sugestão de correção:** criar um índice único parcial `CREATE UNIQUE INDEX … ON downtimes("equipmentId") WHERE "endedAt" IS NULL AND "deletedAt" IS NULL` e converter a violação P2002 em 409. Outra opção é `SELECT … FOR UPDATE` no equipamento dentro da transação.

### [MÉDIO] Paradas retroativas podem se sobrepor a paradas já encerradas do mesmo equipamento (e começar antes do cadastro)
- **Área / camada:** E / Backend
- **Onde:** `backend/src/downtime/downtime.service.ts:36-46`
- **Como reproduzir:** no mesmo equipamento, registrar a parada A (início em agora−10h) e encerrá-la em agora−6h. Depois registrar a parada B com início em agora−8h e encerrá-la em agora−7h. Por fim, registrar uma parada com início **1 ano atrás**, para um equipamento cadastrado hoje, com `openCorrective: true`.
- **Esperado:** 409/400. Um equipamento não pode estar "parado duas vezes" no mesmo intervalo (decisão 2.3), e a parada não pode começar antes de o equipamento existir.
- **Obtido:** todas as chamadas retornaram 201/200. As paradas A e B ficaram sobrepostas, e o filtro por período devolve as duas. A parada de 1 ano atrás abriu uma corretiva com prazo `2025-10-26`, que já nasceu vencida há um ano.
- **Causa provável:** a única verificação é "existe parada **aberta**?". Ninguém verifica se o intervalo se sobrepõe a paradas encerradas, nem compara com `equipment.createdAt`. Na soma das horas paradas, a sobreposição conta duas vezes (`metrics.calc.ts:87`).
- **Sugestão de correção:** na criação e no encerramento, recusar intervalos que se sobreponham a outra parada do equipamento e `startedAt < equipment.createdAt`, ou pelo menos limitar o quanto se pode voltar no tempo.

### [BAIXO] Descrição da parada só com espaços é aceita e gravada vazia
- **Área / camada:** E / Backend
- **Onde:** `backend/src/downtime/dto/create-downtime.dto.ts:30` e `backend/src/downtime/downtime.service.ts:53`
- **Como reproduzir:** `POST /downtime` com `{ "description": "   ", "cause": "MECHANICAL", "equipmentId": … }`.
- **Esperado:** 400 (a descrição é obrigatória).
- **Obtido:** 201 com `"description": ""`. A linha aparece na página Paradas sem texto abaixo do nome (`dt-user-390-03-list-after-create.png`, linha "dt2 PUMP").
- **Causa provável:** `@IsNotEmpty()` aceita espaços, e o `trim()` só acontece depois da validação.
- **Sugestão de correção:** `@Transform(({ value }) => value?.trim())` antes de `@IsNotEmpty()`, ou validar o texto já aparado no service. A tela já faz isso (`description.trim()`).

### [BAIXO] Equipamento INATIVO aceita registro de parada (e o botão aparece no detalhe)
- **Área / camada:** E / Backend + Frontend
- **Onde:** `backend/src/downtime/downtime.service.ts:29-31` (filtra só `deletedAt`) e `frontend/src/pages/EquipmentDetail.tsx:147` (botão "Registrar parada" sem condição de status)
- **Como reproduzir:** desativar um equipamento (`PATCH /equipment/:id/toggle-status`) e depois, como USER, `POST /downtime` com `openCorrective: true`.
- **Esperado:** o mesmo critério nas duas entradas. O diálogo da página Paradas lista só ativos (`getAll('ACTIVE')`, decisão 2.12), então a API e o detalhe deveriam recusar ou esconder a ação.
- **Obtido:** 201, com uma parada aberta e uma corretiva para um equipamento inativo. Nos indicadores, essas horas paradas entram no numerador, mas o equipamento fica fora do denominador (`metrics.service.ts`: `equipmentCount` conta só `ACTIVE`, e as paradas não filtram por status).
- **Sugestão de correção:** decidir a regra (provavelmente "só ativos") e aplicá-la na API, no botão do detalhe e no cálculo de métricas.

### [BAIXO] Corretiva pode ser concluída com data anterior à própria criação e à preventiva de origem
- **Área / camada:** E / Backend
- **Onde:** `backend/src/maintenance/maintenance.service.ts:146-148`
- **Como reproduzir:** a preventiva foi concluída hoje e abriu uma corretiva. Concluir a corretiva com `{ "observations": "Correia alinhada", "concludedAt": <hoje − 30 dias> }`.
- **Esperado:** 400 (a correção não pode ser anterior ao achado).
- **Obtido:** 201, com `concludedAt` 30 dias antes da preventiva que gerou a corretiva. É o mesmo problema geral de `concludedAt` livre que a área C já registrou. Aqui o efeito é pior porque quebra a ordem origem → corretiva no histórico.
- **Sugestão de correção:** exigir `concludedAt ≥ createdAt` da corretiva (ou `≥ origin.concludedAt`) e não aceitar datas no futuro.

### [BAIXO] Datas vazias nos diálogos de parada mostram só "Erro ao registrar/encerrar parada"
- **Área / camada:** E / Frontend
- **Onde:** `frontend/src/components/downtime-dialogs.tsx:73` e `:194`
- **Como reproduzir:** em "Registrar parada", apagar o campo Início e enviar. Em "Encerrar parada", apagar "Voltou a operar em" e enviar.
- **Esperado:** mensagem de validação ("Informe o início da parada").
- **Obtido:** toasts genéricos "Erro ao registrar parada" e "Erro ao encerrar parada". `new Date('').toISOString()` lança `RangeError` dentro do `try`, e o `apiErrorMessage` cai no texto padrão. Nada vai para o servidor e o console fica limpo. (No registro de manutenção, o mesmo caso foi registrado pela área C.)
- **Sugestão de correção:** validar o campo antes de converter a data.

### [BAIXO] Corretiva aberta por parada aparece como "Achados da preventiva"
- **Área / camada:** E / Frontend
- **Onde:** `frontend/src/pages/MaintenanceRegister.tsx:270`
- **Como reproduzir:** registrar uma parada com "Abrir ordem corretiva" marcado e depois abrir o registro dessa corretiva (link "Aberta" na página Paradas).
- **Esperado:** um título que corresponda à origem, por exemplo "Motivo da parada".
- **Obtido:** o título fixo "Achados da preventiva" aparece sobre o texto "Parada (mecânica): …". Essa corretiva tem `originId = null`.
- **Sugestão de correção:** usar `originId ? 'Achados da preventiva' : 'Descrição'`, ou devolver `downtime` no `GET /maintenance/:id` e mostrar a parada de origem.

### [BAIXO] Histórico do equipamento não mostra o vínculo origem ↔ corretiva, e as notas "Não OK" só aparecem em tooltip
- **Área / camada:** E / Frontend
- **Onde:** `frontend/src/pages/EquipmentDetail.tsx:58-73` (`ChecklistCell`) e `:296-330`
- **Como reproduzir:** concluir uma preventiva com um item "Não OK" e abrir o detalhe (`admin-1440-04-detail-after-nok.png`).
- **Esperado:** o plano (Fase 1) pede que o histórico mostre "o resultado do checklist (ícones OK/NOK) e o vínculo origem ↔ corretiva".
- **Obtido:** a célula mostra só "1 Não OK · 1 N.A.". Os itens e as notas ficam num `title` (inacessível no celular), e não existe link entre a preventiva e a corretiva. Depois de concluída, a descrição da corretiva (os achados) some da tela, porque o card "Corretivas abertas" só lista as abertas.
- **Sugestão de correção:** linha expansível ou link "Ver corretiva" / "Origem", com as notas visíveis.

### [BAIXO] Mobile 390px: o filtro "Em andamento | Encerradas | Todas" passa da borda do card
- **Área / camada:** E / Frontend
- **Onde:** `frontend/src/pages/Downtimes.tsx:75-85`
- **Como reproduzir:** abrir `/downtime` com viewport de 390px.
- **Esperado:** o filtro cabe no card ou quebra de linha.
- **Obtido:** o grupo termina em x=387px e o card em x=374px. O botão "Todas" fica cortado pela borda (`dt-user-390-03-list-after-create.png`, `m-downtime-390.png`). Não há rolagem horizontal na página.
- **Sugestão de correção:** `w-full` com segmentos flexíveis no celular, ou rótulos menores.

### [BAIXO] Detalhes de contrato e feedback
- **Área / camada:** E / Backend + Frontend
- **Onde / obtido:**
  - Mensagens do `class-validator` em inglês nas rotas novas (`"cause must be one of the following values: …"`, `"checklist.0.result must be one of the following values: OK, NOK, NA"`, `"each value in nested property checklist must be either object or array"`). O front valida antes, então só aparecem via API ou Swagger.
  - `POST /downtime` sem corpo devolve "description must be shorter than or equal to 1000 characters" junto com "should not be empty".
  - Com a tolerância de 5 min (decisão 2.9), dá para abrir uma parada com início em agora+4min. Encerrá-la "agora" devolve 400 "O fim da parada não pode ser anterior ao início" até o relógio alcançar o início. Essa parada também fica no topo da lista, ordenada por `startedAt desc`.
  - Aviso "N equipamento(s) parado(s)" no dashboard: o "há X" é calculado só no render e não atualiza (`frontend/src/pages/Dashboard.tsx:203` não usa `useNow`, ao contrário da página Paradas e do detalhe).
- **Sugestão de correção:** mensagens em pt-BR no DTO e `useNow()` no aviso do dashboard.

---

## Divergências em relação ao plano e às decisões

| Item do plano/decisão | Situação | Severidade |
|---|---|---|
| Decisão 2.3: no máximo uma parada aberta por equipamento | Vale em requisições sequenciais e falha em requisições simultâneas (achado ALTO acima) | Alto |
| Fase 1: "`findUpcoming`/`findOverdue`/stats: … Query `kind` opcional" | Não implementado. `GET /maintenance/upcoming?days=10&kind=PREVENTIVE` devolveu 200 **com corretivas** (o parâmetro é ignorado em `maintenance.controller.ts:37` e `:44`) | Baixo |
| Fase 1: histórico com ícones OK/NOK e vínculo origem ↔ corretiva | Só um resumo em texto, e as notas ficam num tooltip (achado acima) | Baixo |
| Fase 2: página Paradas com filtro "abertas / **período**" | A tela tem só Em andamento / Encerradas / Todas. O filtro de período existe só na API (`from`/`to`) (`Downtimes.tsx:29-46`) | Baixo |
| Fase 2: "`Equipment` no payload ganha `isDown`" | Substituído pela decisão 2.10 (`downtimes` com a parada em andamento). Lista, detalhe e dashboard usam isso de forma consistente. Não é defeito, só falta atualizar o plano | — |
| Decisão 1.2 (prazo "contado da conclusão") | Preventiva concluída com data retroativa (10 dias atrás) com NOK gera uma corretiva **já vencida** ao nascer (prazo +3 dias, a partir da data informada) e que entra na hora em "Vencidas". Segue a regra como escrita; vale confirmar se é o desejado | — (dúvida de domínio) |

---

## O que foi testado e passou

| Cenário | Resultado |
|---|---|
| Preventiva toda OK | 201, `corrective: null`, próxima preventiva criada |
| Preventiva com 1 NOK (com nota), 1 OK, 1 NA sem nota (PUMP, média) | 201, **uma** corretiva `kind=CORRECTIVE`, `originId` correto, prazo = conclusão **+3 dias**, descrição "Itens não conformes…\n- Vibração ok: Vibração alta no mancal" (nota aparada) |
| Preventiva com 2 NOK (PANEL, baixa) | Uma corretiva só, com os 2 itens e as 2 notas, prazo **+7 dias** |
| Preventiva com NOK em equipamento de criticidade alta (CONVEYOR) | Prazo **+1 dia** |
| NA sem nota | Aceito, sem corretiva. NA com nota guarda a nota |
| NOK sem nota / nota só com espaços | 400 "Descreva o problema encontrado em …" |
| Sem checklist, `[]`, item faltando, item inexistente, item duplicado, item com caixa ou espaços diferentes, resultado inválido (`X`, `ok`), formato legado `string[]`, `null` no array, nota com 501 caracteres, campo extra | 400 com mensagem específica. A manutenção continua `SCHEDULED` |
| Corretiva sem solução, com solução só de espaços, só com checklist | 400 "Descreva a solução aplicada na corretiva" |
| Corretiva concluída com checklist NOK enviado junto | 201, checklist ignorado (`null`), `next: null`, `corrective: null`, ou seja, **não existe corretiva de corretiva** |
| `GET /maintenance/:id` | A preventiva traz `correctives` e a corretiva traz `origin` |
| Concluir de novo (preventiva e corretiva) | 409 "Esta manutenção já foi concluída" |
| **3 conclusões simultâneas** da mesma preventiva (com NOK) | 1×201 + 2×409. Exatamente 1 próxima preventiva e 1 corretiva |
| **3 conclusões simultâneas** da mesma corretiva | 1×201 + 2×409 |
| **3 encerramentos simultâneos** da mesma parada | 1×200 + 2×409 |
| ID inexistente / não UUID / sem token | 404 / 404 / 401 |
| USER conclui corretiva, registra e encerra parada | Permitido (decisão 2.8). Na área não existe ação exclusiva de ADMIN |
| Parada: corpo vazio, causa inválida, descrição >1000, `equipmentId` não UUID, equipamento inexistente | 400 / 400 / 400 / 400 / 404 |
| Parada com início em +1h / fim em +1h / fim antes do início / fim com data inválida | 400 com mensagem em pt-BR |
| Segunda parada aberta (sequencial) | 409 |
| Encerrar parada já encerrada | 409 "Esta parada já foi encerrada" |
| Parada com `openCorrective: true` (criticidade alta) | Corretiva com prazo = início **+1 dia**, `originId: null`, descrição "Parada (mecânica): …" |
| Filtros `GET /downtime`: `equipmentId`, `open=true/false`, `from`/`to` (sobreposição), `from > to` (lista vazia), `open=maybe`/`open=1`/`from=ontem`/`equipmentId=abc` | Resultados corretos. Entradas inválidas → 400 |
| `GET /equipment` e `/equipment/:id` | `downtimes` traz a parada em andamento (0 ou 1) |
| Tela de registro (1440 e 390, ADMIN e USER) | Envio vazio → "Responda todos os itens". NOK abre campo de nota com borda de erro. Aviso "Será aberta uma ordem corretiva com prazo de N dia(s)" com N certo (3 média, 1 alta). "Pendentes como OK" mantém o NOK. Resumo "X de 3 respondidos · …" atualiza. NOK sem nota é bloqueado no front. Após salvar: toast "Ordem corretiva aberta · Prazo: dd/mm · Abrir" e volta ao detalhe |
| Registro de corretiva | Título "Registrar corretiva", selo "Corretiva", achados visíveis, envio vazio → "Descreva a solução aplicada". Sucesso → toast. Revisitar → "Esta manutenção já foi concluída" |
| Selo "Corretiva" | Aparece no histórico do detalhe, no card "Corretivas abertas (n)" e nas tabelas Vencidas / A vencer do dashboard. O KPI "Corretivas abertas" funciona |
| Página Paradas (ADMIN e USER) | Diálogo com "Abrir ordem corretiva" marcado por padrão. A lista de equipamentos omite os já parados. Início no futuro → toast com a mensagem da API. Registro → "Parada registrada e corretiva aberta". A linha mostra "Parado" pulsando, a duração, "Preventiva vencida? Não" e a corretiva "Aberta". Encerrar com fim antes do início → mensagem da API. Encerrar válido → "Parada encerrada; equipamento voltou a operar" |
| Status "Parado" de ponta a ponta | Lista de equipamentos ("Parado"), detalhe (badge, alerta "Equipamento parado há 30min", botão "Encerrar parada") e aviso do dashboard. **Ao encerrar, tudo volta a "Ativo"** e o botão volta a ser "Registrar parada" |
| Filtros da tela (Em andamento / Encerradas / Todas) | Contagens coerentes com a API |
| Console | Nenhum erro de JS nas telas da área. Só os `Failed to load resource: 400` esperados nas validações provocadas de propósito |
| Mobile 390px | Checklist cabe sem rolagem horizontal. O diálogo "Registrar parada" cabe na tela (16px de margem). A página não rola na horizontal, mas a tabela de paradas rola dentro do card |

---

## Não confirmado / observações

- **"Realizadas (mês)" conta corretivas concluídas** (`countCompletedThisMonth` não filtra `kind`). A decisão 1.6 só fala de "vencidas" e "a vencer", então não ficou claro se isso é intencional. Fica para a área D/F validar.
- Durante o teste, um toast do Sonner no canto superior direito ficou em cima do filtro da página Paradas, enquanto o mouse estava sobre ele, e bloqueou o clique em "Encerradas". Acontece só enquanto o cursor fica sobre o toast (o Sonner pausa nesse caso). Não foi classificado como defeito.
- O relógio do servidor usa `TZ=America/Sao_Paulo` (UTC-3) e o navegador usou UTC-4. Os prazos das corretivas foram conferidos em instantes absolutos (+1/+3/+7 × 24h) e bateram. Os efeitos de fronteira de dia em "Vencidas"/"A vencer" ficaram com a área D.
