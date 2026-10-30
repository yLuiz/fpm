# Revisão funcional — Área D. Dashboard e Configurações (+ layout transversal)

- **Data:** 2026-10-24 (testes entre 20:15 e 20:22 UTC)
- **Padrão seguido:** `docs/process/padrao-revisao-funcional.md`
- **Ambiente:** API `http://localhost:3001` (container `fpm-backend`, relógio/TZ em **UTC**, `TZ` vazio), frontend `http://localhost:5173` (container `fpm-frontend`). Nenhum container foi reiniciado, nenhum código foi alterado. 1 login por usuário (admin e user), tokens reaproveitados e injetados no `localStorage` do navegador.
- **Código revisado:** o que estava no disco. Os arquivos da área (`Dashboard.tsx` 15:59, `Settings.tsx` 16:00, `Layout.tsx`/`layout/*` 15:58 horário local) não mudaram durante a revisão.
- **Navegador:** Playwright/Chromium headless, `timezoneId: America/Sao_Paulo`, `locale: pt-BR`, viewports 1440×900 e 390×844.
- **Evidências (scripts e screenshots):** `C:\Users\LUIZ\AppData\Local\Temp\claude\e--Estudos-ProjetosPessoais-Descomplica\57045645-c400-4d0a-90e7-53fb4f2bb27a\scratchpad\e2e\area-d\`
  - `settings1.mjs` (validação/autorização de settings, health, filtro), `create.mjs`, `freq.mjs`, `toggle.mjs`, `snap.mjs`, `cleanup.mjs` (API)
  - `ui1.mjs`, `ui2.mjs` (navegador) e `*.png` (screenshots)
- **Dados de teste:** criei 3 equipamentos `[REVIEW-D] …` (1 CONVEYOR, 2 MOTOR); todos foram excluídos (soft delete) ao final.
- **Frequência alterada:** só `CONVEYOR` (valor original **15**). Via API: 15→20 por ~1,3 s (20:17:27 → 20:17:28 UTC). Via tela: 15→16 por ~4 s (até 20:20:20 UTC). **Restaurada para 15** e conferida com `GET /settings/frequency` ao final (`MOTOR 30, COMPRESSOR 15, PUMP 30, CONVEYOR 15, PANEL 60`, igual ao início).
- **Limitação:** os 3 outros revisores criavam/concluíam registros ao mesmo tempo. As comparações tela × API foram feitas com leituras disparadas no mesmo instante (fetch dentro da página logo após renderizar); as comparações de "antes/depois" na API usam requests com milissegundos de diferença. O seed não gera nenhuma manutenção vencida ou a vencer em 3 dias (offset mínimo +10 dias), então criei os casos concluindo manutenções com `concludedAt` no passado.
- **Não existe topbar nem alternância de tema** no código atual: o app é tema escuro único (`index.css:98` `color-scheme: dark`, `index.html:7`, `ui/sonner.tsx` `theme="dark"`), coerente com o design system. Não foi tratado como bug.

---

## Achados

### [MÉDIO] KPIs "A vencer" e "Vencidas" contam (e as tabelas listam) manutenções de equipamentos INATIVOS, enquanto "Total de equipamentos" e o gráfico por tipo contam só ATIVOS
- **Área / camada:** D. Dashboard / Backend + Frontend
- **Onde:** `backend/src/maintenance/maintenance.service.ts:182-221` (`countUpcoming`/`countOverdue`) e `:37-88` (`findUpcoming`/`findOverdue`); `frontend/src/pages/Dashboard.tsx:127` e `:185`
- **Como reproduzir:**
  1. Criar equipamento MOTOR `[REVIEW-D] Motor Vencido`; concluir a manutenção inicial com `concludedAt = agora − 40 dias` → próxima vence em 14/10 (vencida).
  2. `GET /maintenance/stats` → `overdue: 1`; `GET /equipment?status=ACTIVE` → 28.
  3. `PATCH /equipment/:id/toggle-status` → `INACTIVE`.
  4. `GET /maintenance/stats` e `GET /maintenance/overdue` de novo.
- **Esperado:** regra única para o dashboard: ou equipamento inativo sai dos KPIs/tabelas de manutenção (não precisa de manutenção enquanto parado), ou o "Total" também inclui inativos. Os números do mesmo painel devem falar do mesmo universo.
- **Obtido:** depois do passo 3, `stats.overdue` continua `1` e `/overdue` continua listando `[REVIEW-D] Motor Vencido` com `equipment.status = INACTIVE`, enquanto `ACTIVE` caiu para 27 (`snap.mjs`). Na tela, a linha do equipamento inativo aparece em "Manutenções vencidas" com botão "Registrar", mas ele não entra em "Total de equipamentos" nem no gráfico "Equipamentos por tipo" (`Dashboard.tsx:127` chama `equipmentApi.getAll('ACTIVE')`).
- **Causa provável:** os filtros de manutenção só olham `equipment.deletedAt: null`, sem `equipment.status: 'ACTIVE'`; o "Total" é calculado no front a partir da lista de ativos.
- **Sugestão de correção:** decidir a regra e aplicar nos dois lados; o mais natural é adicionar `equipment: { deletedAt: null, status: 'ACTIVE' }` em `countUpcoming`, `countOverdue`, `findUpcoming` e `findOverdue`. Se o "Total" deve contar só ativos, deixar isso explícito no rótulo ("Equipamentos ativos").

### [MÉDIO] "Hoje" é calculado em UTC no backend e no fuso local no frontend: manutenção vencida aparece em "A vencer" com data de ontem em vermelho
- **Área / camada:** D. Dashboard / Backend + Frontend (afeta também a Área C)
- **Onde:** `backend/src/maintenance/maintenance.service.ts:38-39`, `:67-68`, `:183-184`, `:206-207` (`new Date(); setHours(0,0,0,0)` no fuso do container = UTC); `frontend/src/lib/format.ts:19-26` (`isOverdue` no fuso do navegador); `frontend/src/pages/Dashboard.tsx:94`
- **Como reproduzir:** com o registro criado pelo revisor C (`[REVIEW-C] tz MOTOR`, `dueDate = 2026-10-24T02:00:00Z`, ou seja 23/10 23:00 em Brasília), abrir o Dashboard em 24/10 com o navegador no fuso America/Sao_Paulo.
- **Esperado:** a manutenção venceu ontem (horário local) → aparece em "Vencidas" e conta no KPI "Vencidas".
- **Obtido:** a API conta como `upcoming` (o "hoje" do servidor começa em 24/10 00:00 UTC). Na tela, a linha fica na tabela **"A vencer (3 dias)" com a data 23/10/2026 em vermelho** (`text-danger-text`), e o KPI "Vencidas" mostra 1 em vez de 2 (`ui1.mjs`/`ui2.mjs`, `admin-dashboard-1440-settled.png`). O inverso também acontece pela mesma conta: das 21:00 às 23:59 (horário de Brasília) o servidor já está no dia seguinte, então uma manutenção que vence "hoje" no horário local passa a ser contada como vencida.
- **Causa provável:** o container roda em UTC e não há fuso de negócio definido; o front calcula vencimento com o fuso do navegador.
- **Sugestão de correção:** definir o fuso da fábrica (ex.: `TZ=America/Sao_Paulo` no container, ou calcular início do dia com uma lib de datas e fuso explícito) e usar a mesma regra no front; idealmente o backend devolver o status efetivo (`OVERDUE`/`UPCOMING`) e o front só exibir.

### [MÉDIO] Dashboard sem estado de erro: se uma das 4 chamadas falha, todos os KPIs ficam 0 e as tabelas dizem "Nenhuma manutenção vencida"
- **Área / camada:** D. Dashboard / Frontend
- **Onde:** `frontend/src/pages/Dashboard.tsx:124-139`
- **Como reproduzir:** no Playwright, interceptar `GET /maintenance/stats` com 500 (`page.route`) e abrir `/` (admin e user).
- **Esperado:** mensagem de erro (toast ou card de erro com "tentar novamente"); os dados que carregaram (ex.: equipamentos) continuam visíveis.
- **Obtido:** os 4 KPIs mostram **0** (inclusive "Total de equipamentos", cuja chamada deu certo), o gráfico de pizza mostra "Sem dados", as tabelas mostram "Nenhuma manutenção vencida" / "Nenhuma manutenção a vencer". Nenhum toast; só `console.error('Error loading dashboard data: AxiosError')` (`admin-dashboard-stats-500.png`). Para quem usa o painel, parece que está tudo em dia.
- **Causa provável:** `Promise.all` rejeita tudo se uma promessa falha; o `catch` só faz `console.error` e não há estado `error`.
- **Sugestão de correção:** guardar um estado de erro e renderizar mensagem + botão de recarregar; usar `Promise.allSettled` para mostrar o que carregou.

### [MÉDIO] Filtro global devolve a mensagem interna de qualquer erro não-HTTP (Prisma) com status 500 — inclui caminho do código e trecho do fonte
- **Área / camada:** D. Configurações / Backend (transversal: `common/filters`)
- **Onde:** `backend/src/common/filters/http-exception.filter.ts:29-31`; gatilho na área: `backend/src/settings/settings.controller.ts:36` (`@Param('type')` sem validação)
- **Como reproduzir:**
  - `PUT /settings/frequency/FOO` (admin) com `{"frequencyDays":15}`
  - `PUT /settings/frequency/conveyor` (minúsculo)
  - também: `GET /maintenance/upcoming?days=99999999` (endpoint da Área C)
- **Esperado:** `400` com mensagem clara ("Tipo de equipamento inválido") e, para erros inesperados, `500` com mensagem genérica.
- **Obtido:** `500` com `message` contendo o erro bruto do Prisma: ``Invalid `this.prisma.frequencySettings.upsert()` invocation in /app/dist/settings/settings.service.js:45:46`` + trecho do código compilado + `Invalid value for argument equipmentType. Expected EquipmentType.` (`settings1.mjs`). O mesmo acontece em `upcoming?days=99999999` (data inválida no Prisma).
- **Causa provável:** o filtro usa `exception.message` para qualquer `Error`; o `type` da rota não passa por `ParseEnumPipe`.
- **Sugestão de correção:** no filtro, para não-`HttpException` responder `'Internal server error'` e só logar o detalhe; no controller usar `@Param('type', new ParseEnumPipe(EquipmentType)) type`. Para `days`, limitar com validação (ex.: 1–365).

### [BAIXO] Configurações: apagar o campo ou digitar 0 vira "1" sozinho e libera o "Salvar" (risco de gravar 1 dia sem querer); decimal é truncado
- **Área / camada:** D. Configurações / Frontend
- **Onde:** `frontend/src/pages/Settings.tsx:122` (`parseInt(e.target.value) || 1`)
- **Como reproduzir:** admin em `/settings`, linha "Esteira Transportadora" (valor 15): digitar `0`; depois apagar o campo; depois digitar `2.7`.
- **Esperado:** campo mostra o que foi digitado e o "Salvar" fica bloqueado com aviso "entre 1 e 365" (a validação de `handleSave` já existe para isso).
- **Obtido:** `0` → campo vira **1** e "Salvar" habilitado; campo vazio → **1** e "Salvar" habilitado; `2.7` → **2** (`ui2.mjs`). A validação de `handleSave` (1–365) nunca vê o 0. Negativo (`-3`) e `400` são barrados com toast "A frequência deve estar entre 1 e 365 dias" e nada é enviado (correto).
- **Causa provável:** `0 || 1` e `NaN || 1` caem no fallback 1; `parseInt` descarta a parte decimal.
- **Sugestão de correção:** guardar o texto do input e validar no salvar (`Number(v)`, `Number.isInteger`, 1–365), sem fallback silencioso.

### [BAIXO] Configurações: erro ao salvar mostra só "Erro ao atualizar frequência", sem a mensagem da API
- **Área / camada:** D. Configurações / Frontend
- **Onde:** `frontend/src/pages/Settings.tsx:59-61`
- **Como reproduzir:** rastreado no código: o `catch` ignora `error.response.data.message` (a API devolve mensagens claras, ex.: `["Frequência máxima é 365 dias"]`, e 403 "Forbidden resource" se a role mudou).
- **Esperado:** toast com o motivo.
- **Obtido:** texto genérico.
- **Sugestão de correção:** extrair `error.response?.data?.message` (string ou array) no toast.

### [BAIXO] Alteração de frequência (configuração global, só ADMIN) não gera audit log
- **Área / camada:** D. Configurações / Backend
- **Onde:** `backend/src/settings/settings.service.ts:41-50`
- **Como reproduzir:** rastreado no código: `updateFrequency` faz `upsert` direto; `AuditService` não é injetado em `SettingsService` (só `auth` e `equipment` registram auditoria). Não há endpoint de leitura de auditoria para confirmar via API.
- **Esperado:** registro `UPDATE` em `FrequencySettings` com `oldValue`/`newValue` e usuário, como acontece em equipamentos.
- **Obtido:** nenhuma chamada de auditoria.
- **Sugestão de correção:** injetar `AuditService` e registrar a alteração passando o `userId` do request.

### [BAIXO] "Realizadas (mês)" diminui quando um equipamento é excluído (o histórico some do KPI)
- **Área / camada:** D. Dashboard / Backend
- **Onde:** `backend/src/equipment/equipment.service.ts:140-143` (soft delete de **todas** as manutenções do equipamento) + `backend/src/maintenance/maintenance.service.ts:170-178` (`deletedAt: null`)
- **Como reproduzir:** concluir a manutenção de `[REVIEW-D] Esteira Frequencia` hoje; `GET /maintenance/stats` → `completedThisMonth: 9`; `DELETE /equipment/:id`; `GET /maintenance/stats` → `8` (requests disparados com ms de diferença, `cleanup.mjs`).
- **Esperado:** manutenção já realizada no mês continua contando como realizada (é fato histórico); só as agendadas deveriam sair.
- **Obtido:** o KPI cai em 1.
- **Sugestão de correção:** no soft delete do equipamento, marcar só as manutenções `SCHEDULED`; ou contar as `DONE` sem filtrar `deletedAt`.

### [BAIXO] Rota inexistente deixa a tela totalmente em branco
- **Área / camada:** D. Layout / Frontend
- **Onde:** `frontend/src/App.tsx:29-47` (sem rota `*`)
- **Como reproduzir:** logado, abrir `http://localhost:5173/rota-inexistente`.
- **Esperado:** página "não encontrada" dentro do layout, ou redirecionamento para `/`.
- **Obtido:** página vazia, sem sidebar (body sem texto), console: `No routes matched location "/rota-inexistente"` (`admin-unknown-route.png`).
- **Sugestão de correção:** `<Route path="*" element={<Navigate to="/" />} />` (ou uma página 404 dentro do `Layout`).

### [BAIXO] Mobile (390px): não existe menu mobile; a sidebar recolhida ocupa 80px fixos (20% da largura)
- **Área / camada:** D. Layout / Frontend
- **Onde:** `frontend/src/components/Layout.tsx:17` (`pl-20` fixo) e `frontend/src/components/layout/sidebar.tsx:124-125` (`w-20` sempre visível)
- **Como reproduzir:** viewport 390×844 em `/` e `/settings`.
- **Esperado:** em telas estreitas, sidebar escondida e acessível por botão de menu (o shadcn `sheet.tsx` já está no projeto).
- **Obtido:** funciona e **não há rolagem horizontal** (`scrollWidth = 390`), mas o conteúdo fica com 310px; o expandir (240px) abre sobreposto com overlay e fecha ao tocar fora, corretamente (`admin-dashboard-390.png`, `admin-sidebar-expanded-390.png`). É usabilidade, não quebra.
- **Sugestão de correção:** abaixo de `md`, esconder a sidebar e usar `Sheet` com botão hambúrguer; `pl-0` no `main`.

### [BAIXO] Sidebar recolhida usa dois ícones de engrenagem ("Equipamentos" e "Configurações")
- **Área / camada:** D. Layout / Frontend
- **Onde:** `frontend/src/components/layout/nav.ts:20` (`Cog` para Equipamentos) e `:28` (`Settings` para Configurações)
- **Como reproduzir:** ver `admin-settings-1440.png` (sidebar recolhida): duas engrenagens quase iguais; só o tooltip diferencia.
- **Sugestão de correção:** outro ícone para Equipamentos (ex.: `Factory`, `Wrench`, `Package`).

### [BAIXO] Título da aba do navegador é o mesmo em todas as telas
- **Área / camada:** D. Layout / Frontend
- **Onde:** `frontend/index.html:8`; nenhuma tela altera `document.title`
- **Como reproduzir:** navegar Dashboard → Equipamentos → Configurações.
- **Obtido:** sempre "FPM - Factory Preventive Maintenance" (os `<h1>` estão corretos: "Dashboard", "Equipamentos", "Configurações", "Registrar manutenção").
- **Sugestão de correção:** definir `document.title` por página (ex.: no `PageHeader`).

### [BAIXO] Erro de console "Function components cannot be given refs" vindo do `Button` (transversal; observado em /equipment)
- **Área / camada:** transversal (componente compartilhado) — impacto funcional fica com a Área B
- **Onde:** `frontend/src/components/ui/button.tsx:51-70` (função sem `forwardRef`, padrão shadcn para React 19) com `react@^18.2.0` (`frontend/package.json:19`)
- **Como reproduzir:** abrir `/equipment` com o console aberto.
- **Obtido:** `Warning: Function components cannot be given refs… Check the render method of Primitive.button.SlotClone at Button (button.tsx:56)`. Em React 18, qualquer `Trigger asChild` do Radix com `<Button>` dentro não recebe o ref (posicionamento de tooltip/menu depende dele). Dashboard e Configurações não emitem esse erro.
- **Sugestão de correção:** envolver `Button` (e outros componentes usados como filho de `asChild`) em `React.forwardRef`, ou atualizar para React 19.

---

## Não confirmado

- **Throttling global por IP pode derrubar o dashboard em uso real** (`backend/src/app.module.ts:25-41`: 10 req/s, 100 req/min, 1000 req/h por IP). Cada carga do dashboard faz 5 requests (`/auth/me` + 4). Durante a revisão, um script meu tomou 429 em `GET /maintenance/by-equipment` ao fazer ~13 requests seguidos; na tela não vi 429. Vários operadores atrás do mesmo NAT da fábrica dividiriam esse limite. Não reproduzi a falha na tela.
- **`GET /maintenance/upcoming?days=abc` devolve 200 com a janela padrão de 3 dias** em vez de 400 (`DefaultValuePipe` trata `NaN` como ausente). Endpoint da Área C; anotado só como observação.

---

## O que foi testado e passou

| Item | Resultado |
|---|---|
| `GET /maintenance/stats` admin e user | 200 `{upcoming, overdue, completedThisMonth}`; sem token → 401; token inválido → 401 |
| KPIs × API × contagem própria | Na mesma leitura: tela `26 / 3 / 1 / 7` = `stats {3,1,7}` = `len(/upcoming?days=3)=3`, `len(/overdue)=1`, `len(/equipment?status=ACTIVE)=26`. Antes dos meus dados: tudo 0 e coerente |
| Efeito dos meus dados nos KPIs | Concluir com `concludedAt −40d` → `overdue +1`; com `−28d` → `upcoming +1`; conclusões em setembro não contam em "Realizadas (mês)"; conclusão hoje → `+1` |
| "Total de equipamentos" | Conta equipamentos **ativos e não excluídos** (`GET /equipment?status=ACTIVE`, que filtra `deletedAt: null`) |
| Gráfico "Equipamentos por tipo" | Rótulos `11/3/4/4/4` = contagem por tipo dos ativos na API; eixo com os 5 tipos |
| Gráfico "Situação das manutenções" | Setores e legenda = stats; legenda clicável esconde/mostra setores (3→2) e mostra "Sem dados" quando tudo oculto; após a animação a rosca renderiza completa |
| Tabelas "Vencidas" / "A vencer (3 dias)" | Mesmos itens de `/overdue` e `/upcoming?days=3`, datas formatadas pt-BR, estado vazio "Sem dados" |
| Links "Registrar" | Apontam para `/maintenance/<id>/register` da linha; clique abre "Registrar manutenção · <equipamento>" |
| `GET /settings/frequency` | admin e user → 200 com os 5 tipos; sem token → 401 |
| `PUT /settings/frequency/:type` validação | `0`, `-5`, `"abc"`, `"20x"`, `99999999999`, `366`, `2.5`, `{}`, `null`, campo extra, JSON malformado → todos **400** com mensagem clara; valor inalterado |
| `PUT /settings/frequency/:type` autorização | USER → 403 "Forbidden resource" (também com tipo inválido); sem token → 401 |
| Frequência vale só para as próximas | CONVEYOR 15→20, concluir manutenção do meu equipamento → próxima em exatamente **+20,000 dias**; manutenções agendadas das outras 3 esteiras **não mudaram**; restaurado para 15 |
| Settings na tela (ADMIN) | 5 linhas com input e "Salvar"; "Salvar" desabilitado sem mudança; salvar 16 → toast "Frequência atualizada", API = 16, botão volta a desabilitar; voltar para 15 pela tela → API = 15; `-3` e `400` → toast de erro e nada enviado |
| Settings na tela (USER) | Sem inputs nem botões, valores em texto, aviso "Somente administradores podem alterar as configurações." |
| Health | `/health/live` 200 `{status: ok}`; `/health/ready` 200 com database up; `/health` 200 (db, heap, rss); sem token (público) |
| Filtro global | Formato padronizado `{statusCode, timestamp, path, method, message}` em 400/401/403/404/429; rota inexistente na API → 404 "Cannot GET /nope" |
| Navegação da sidebar | Dashboard → `/`, Equipamentos → `/equipment`, Configurações → `/settings`; `aria-current="page"` e destaque só no item da tela atual; `<h1>` correto em cada tela |
| Sidebar recolher/expandir | Recolhida 80px com tooltips; expandir → 240px com rótulos, nome e papel do usuário, overlay; fecha pelo botão "Recolher menu" e clicando no overlay |
| Responsividade | 1440px: grid de 4 KPIs, gráficos lado a lado. 390px: KPIs empilhados, sem rolagem horizontal em `/` e `/settings` |
| Console | Dashboard e Configurações sem erros (só avisos de "future flag" do React Router v6, sem impacto) |
| Tema | Não há alternância; tema escuro único por decisão do design system (não testável, não é bug) |
| Limpeza | 3 equipamentos `[REVIEW-D]` excluídos; frequências finais iguais às iniciais |
