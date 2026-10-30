# Revalidação dos achados das Áreas A, C e D

> **Objetivo:** retestar, no código atual (após a implementação do plano de funcionalidades), cada achado das revisões das Áreas A, C e D e classificá-lo como Corrigido, Persiste ou Mudou.
> **Categoria:** reviews · **Status:** Concluído
> **Atualizado em:** 2026-10-24
> **Relacionados:** [Área A: Autenticação](area-a-auth.md) · [Área C: Manutenções](area-c-manutencoes.md) · [Área D: Dashboard e Configurações](area-d-dashboard-config.md) · [Decisões da implementação](../../plans/decisoes-funcionalidades.md) · [Padrão de revisão](../../process/padrao-revisao-funcional.md)

- **Quando:** 25/10/2026 entre 03:00 e 03:12 UTC, que corresponde a 24/10 entre 23:00 e 23:12 em Manaus e a 25/10 entre 00:00 e 00:12 em Brasília. Pelo horário do autor, a data ainda é 2026-10-24.
- **Ambiente:** API `http://localhost:3001` (container `fpm-backend`, agora com `TZ=America/Sao_Paulo`). Frontend `http://localhost:5173` (`npm run dev`, com StrictMode). Nenhum container foi reiniciado e nenhum código foi alterado.
- **Método:** o mesmo dos achados originais. Testes na API real com Node `fetch` e no navegador com Playwright/Chromium headless, sessão injetada no `localStorage`. Os testes da própria tela de login usaram login real. O 429 da tela foi simulado com `page.route`, sem provocar 429 real. Itens de código puro (sem efeito observável) foram rastreados no código atual.
- **Logins reais:** 2 pela API (admin e user), 2 pela tela (senha errada e login correto do user) e 7 tentativas no teste de throttling, feito por último. **Nenhum 429 foi provocado no login.** Tomei um 429 por concorrência em `POST /maintenance/:id/complete`, aguardei 60 s e repeti.
- **Dados de teste:** 7 equipamentos `[REVIEW-R] …`, todos excluídos (soft delete) ao final. Frequências não foram alteradas: `PUT` só com tipos inválidos, que não gravam nada. Ao final, `MOTOR=30 COMPRESSOR=15 PUMP=30 CONVEYOR=15 PANEL=60`, igual ao início.
- **Limpeza dos `[REVIEW-C]`:** **não havia nenhum para excluir.** `GET /equipment` não retornou nenhum, e uma consulta somente leitura em `equipments` não encontrou nenhuma linha `[REVIEW-C]`, nem mesmo excluída. A base foi recriada com `--reset` na implementação (decisão 5.3 do plano), e isso apagou os dados da rodada anterior.
- **Evidências:** `C:\Users\LUIZ\AppData\Local\Temp\claude\e--Estudos-ProjetosPessoais-Descomplica\57045645-c400-4d0a-90e7-53fb4f2bb27a\scratchpad\e2e\revalidacao\`, com scripts `*.mjs`, logs `*.log` e screenshots `*.png`.

## Resumo

| Área | Achados | Corrigido | Persiste | Mudou |
|---|---|---|---|---|
| A. Autenticação | 15 | 2 | 13 | 0 |
| C. Manutenções | 15 | 5 | 6 | 4 |
| D. Dashboard e Configurações | 13 | 1 | 10 | 2 |
| **Total** | **43** | **8** | **29** | **6** |

---

## A. Autenticação e sessão

| # | Achado | Sev. original | Status | Evidência curta | Arquivo:linha atual |
|---|---|---|---|---|---|
| A1 | Rotação/revogação do refresh token não funciona (bcrypt 72 bytes) | Crítico | **Persiste** | `refresh R1` → 201, `refresh R1` de novo → **201**. Variante logout: user `logout` → `refresh UR1` 401 → login pela tela → `refresh UR1` → **201** (`a-api.log`, `ui-a.log`) | `backend/src/auth/auth.service.ts:42`, `:89`, `:98` |
| A2 | Limite de 5 logins/min não aplicado | Alto | **Persiste** | Headers do login: `limit-short 10`, `medium 100`, `long 1000`. 7 tentativas com 1,2 s de intervalo → 7× 401, nenhum 429 (`throttle.log`) | `backend/src/auth/auth.controller.ts:15`, `:29`; `backend/src/app.module.ts:28-47` |
| A3 | Credencial inválida recarrega a página e não mostra mensagem | Alto | **Corrigido** | Senha errada → toast "Email ou senha inválidos" aos 400 ms e aos 2,4 s; URL continua `/login`; email mantido no campo (`a02-senha-errada-*.png`) | `frontend/src/services/api.ts:43-44` |
| A4 | Frontend não usa refresh token; sessão cai a cada 15 min | Alto | **Persiste** | `localStorage` só tem `token` e `user`. Com o token expirado no meio do uso, 5× 401 e **nenhum** `/auth/refresh`, hard redirect para `/login?from=%2F`, sem toast (`a03-token-expirado.png`) | `frontend/src/contexts/AuthContext.tsx:41-46`; `frontend/src/types/index.ts:109-112`; `frontend/src/services/api.ts:38-52` |
| A5 | Toda falha de login vira "Email ou senha inválidos" | Médio | **Persiste** | 429 simulado → "Email ou senha inválidos"; erro de rede simulado → mesma mensagem (`a07-login-429-mock.png`) | `frontend/src/pages/Login.tsx:40-41` |
| A6 | Tela de login exibe a senha do admin | Médio | **Persiste** | Caixa "Usuário de teste admin@fpm.com · admin123" visível (`a01-login-sem-sessao.png`) | `frontend/src/pages/Login.tsx:96-99` (placeholder em `:75`) |
| A7 | Depois do login, não volta à página pretendida | Médio | **Corrigido** | Sem sessão em `/equipment` → `/login` → login → **`/equipment`**. O interceptor de 401 também guarda `from` | `frontend/src/App.tsx:31`; `frontend/src/pages/Login.tsx:29-31`, `:39` |
| A8 | `localStorage.user` corrompido derruba o app | Baixo | **Persiste** | `SyntaxError … "nao-e-json"`, erro no `<AuthProvider>`, body vazio, inclusive após reload (`a06-user-corrompido.png`) | `frontend/src/contexts/AuthContext.tsx:24` |
| A9 | `/login` acessível estando logado | Baixo | **Persiste** | Logado em `/login` → formulário exibido, sem redirect (`a04-login-logado.png`) | `frontend/src/App.tsx:40` |
| A10 | Rota inexistente → página em branco | Baixo | **Persiste** | `/rota-que-nao-existe` → body vazio e `No routes matched location` (`a05-rota-inexistente.png`) | `frontend/src/App.tsx:39-60` (sem `path="*"`) |
| A11 | JwtStrategy aceita usuário soft-deletado e usa o papel do token | Baixo | **Persiste** | Rastreado: `findUnique` sem `deletedAt` e `role: payload.role` | `backend/src/auth/jwt.strategy.ts:21-23`, `:32` |
| A12 | Auditoria de autenticação incompleta | Baixo | **Persiste** | 7 logins falhos → nenhum registro em `audit_logs`. O `LOGOUT` do teste foi gravado com `ipAddress`/`userAgent` vazios | `backend/src/auth/auth.service.ts:29-37`, `:116-121`; `auth.controller.ts:43-44` |
| A13 | Enumeração de usuário por tempo de resposta | Baixo | **Persiste** | Email existente: 40/40/41 ms; inexistente: 4/4 ms (`throttle.log`) | `backend/src/auth/auth.service.ts:29-31` |
| A14 | Detalhes de contrato e entrada | Baixo | **Persiste** | login/refresh/logout → 201 (Swagger: 200); `ADMIN@FPM.COM/admin123` → 401; segredos JWT em `docker-compose.yml:47-48` | `backend/src/auth/auth.controller.ts:14`, `:28`, `:37`; `backend/src/auth/dto/login.dto.ts:6-8` |
| A15 | Access token válido após logout | Baixo | **Persiste** | Após `logout`, `GET /auth/me` com o mesmo token → 200 | `backend/src/auth/auth.service.ts:110-124` |

## C. Manutenções

| # | Achado | Sev. original | Status | Evidência curta | Arquivo:linha atual |
|---|---|---|---|---|---|
| C1 | Conclusões simultâneas geram várias próximas | Alto | **Corrigido** | 3 `complete` em paralelo → `[201, 409, 409]`; histórico com 1 DONE + **1** SCHEDULED. O "próxima preventiva" do detalhe agora pega a de prazo mais próximo | `backend/src/maintenance/maintenance.service.ts:170-177`; `frontend/src/pages/EquipmentDetail.tsx:126-127` |
| C2 | `update` + `create` fora de transação | Médio | **Corrigido** | Rastreado: conclusão, próxima e corretiva dentro de `prisma.$transaction` | `backend/src/maintenance/maintenance.service.ts:170-203` |
| C3 | Concluir já concluída → 500 e toast genérico | Médio | **Corrigido** | API → **409** "Esta manutenção já foi concluída". Duas abas: na aba B o toast mostra **"Esta manutenção já foi concluída"** (`c01-aba-b-409.png`). A aba continua no formulário, mas a mensagem já é clara | `maintenance.service.ts:142-144`, `:175-177`; `frontend/src/pages/MaintenanceRegister.tsx:133` |
| C4 | `concludedAt` aceita futuro distante e passado arbitrário | Médio | **Persiste** | `concludedAt 2030-01-01` (token USER) → 201, próxima em 2030-01-16. `concludedAt 2026-01-01` → 201, próxima em 2026-01-16 (já vencida). O input não tem `max` | `backend/src/maintenance/dto/complete-maintenance.dto.ts:135-137`; `maintenance.service.ts:146-148`; `MaintenanceRegister.tsx:278-283` |
| C5 | Checklist não validado contra os itens do tipo | Médio | **Corrigido** | Formato antigo, `[]`, ausente, parcial, item inventado/vazio/de outro tipo/duplicado, NOK sem nota e resultado inválido → todos **400** com mensagem clara. `observations` de 20.000 → 400 | `backend/src/maintenance/checklist.ts:33-61` |
| C6 | Não registra quem executou; conclusão sem audit log | Médio | **Mudou** | O audit log agora existe (`UPDATE/Maintenance` com o `userId` do USER que concluiu). Mas o registro e o histórico continuam sem autor: nenhum campo `completedById` nem coluna "Responsável" | `maintenance.service.ts:205-219` (audit); `backend/prisma/schema.prisma:89-114`; `EquipmentDetail.tsx:285-293` |
| C7 | "Hoje" em UTC no backend e no fuso local no front | Médio | **Mudou** | Backend em `America/Sao_Paulo`. Com o navegador em São Paulo, tudo fica coerente. **Com o navegador em Manaus, persiste:** item vencido (prazo 24/10 23:00 BRT) aparece em "Vencidas" com a data em **amarelo**, e o detalhe mostra "Agendada" (`tz-*-Manaus.png`) | `docker-compose.yml:52`; `frontend/src/lib/format.ts:19-26` |
| C8 | Equipamento inativo continua nos alertas e no reagendamento | Médio | **Persiste** | PANEL inativado → continua em `upcoming` com `status INACTIVE`; `complete` → 201 e reagenda | `maintenance.service.ts:61-63`, `:85-87`, `:261-263`, `:279-281`; `backend/src/equipment/equipment.service.ts:120-140` |
| C9 | `upcoming?days=` com validação fraca e 500 que vaza a query | Médio | **Persiste** | `-5` → `[]`; `abc` → default 3; `99999999` e `99999999999` → **500** com trecho de `/app/dist/maintenance/maintenance.service.js:45` e da query Prisma | `backend/src/maintenance/maintenance.controller.ts:37`; `maintenance.service.ts:49-51`; `backend/src/common/filters/http-exception.filter.ts:29-30` |
| C10 | Checklist registrado nunca aparece na interface | Baixo | **Mudou** | O histórico ganhou a coluna "Checklist" com o resumo ("3 OK", "N Não OK · N.A."), e o tooltip mostra só os itens NOK. Ainda não dá para ver item a item; observações continuam truncadas (o texto completo só aparece no `title`) | `frontend/src/pages/EquipmentDetail.tsx:59-73`, `:311` |
| C11 | Histórico ordenado por data prevista mistura concluídas e agendadas | Baixo | **Persiste** | `tz MOTOR`: a linha concluída (prevista 24/11) aparece **acima** da agendada vencida (24/10) (`c04-detalhe-tz.png`) | `backend/src/equipment/equipment.service.ts:79-81`; `EquipmentDetail.tsx:296` |
| C12 | Data de conclusão vazia → `RangeError` e toast genérico | Baixo | **Persiste** (pior) | `pageerror: Invalid time value`, **nenhum** toast e nada enviado (`c02-data-vazia.png`). Ver Regressões | `frontend/src/pages/MaintenanceRegister.tsx:103`, `:115` |
| C13 | Endpoints auxiliares respondem 200 para entrada inválida | Baixo | **Persiste** | `checklist/FOO` e `checklist/motor` → 200 `items: []`; `by-equipment/0000…` → 200 `[]` | `maintenance.controller.ts:58-63`, `:68-70` |
| C14 | `observations` sem limite | Baixo | **Corrigido** | 20.000 caracteres → 400 "must be shorter than or equal to 2000". O `<Textarea>` ainda não tem `maxLength` (detalhe de UX) | `complete-maintenance.dto.ts:154-157` |
| C15 | Pequenas inconsistências de contrato e feedback | Baixo | **Mudou** | O Swagger do `complete` agora documenta 201 (corrigido). Persistem: registro inexistente → **2 toasts** "Erro ao carregar manutenção" (`c03-registro-404.png`), e a data padrão é a hora de abertura da página | `maintenance.controller.ts:82`; `MaintenanceRegister.tsx:53`, `:56-75`; `frontend/src/main.tsx:11` |

## D. Dashboard e Configurações

| # | Achado | Sev. original | Status | Evidência curta | Arquivo:linha atual |
|---|---|---|---|---|---|
| D1 | KPIs/tabelas contam manutenções de equipamentos inativos; "Total" só ativos | Médio | **Persiste** | Inativar `tz MOTOR` (vencido) → `stats.overdue` não muda e `/overdue` continua listando o item com `INACTIVE` | `maintenance.service.ts:61-63`, `:85-87`, `:261-263`, `:279-281`; `frontend/src/pages/Dashboard.tsx:136` |
| D2 | "Hoje" em UTC no backend e no fuso local no front | Médio | **Mudou** | Igual ao C7: coerente em São Paulo, incoerente em Manaus | `docker-compose.yml:52`; `frontend/src/lib/format.ts:19-26`; `Dashboard.tsx:101` |
| D3 | Dashboard sem estado de erro | Médio | **Persiste** | `stats` → 500 (simulado): os 5 KPIs ficam 0, inclusive "Total de equipamentos"; as tabelas mostram "Nenhuma manutenção vencida"; nenhum toast (`d01-dashboard-stats-500.png`) | `frontend/src/pages/Dashboard.tsx:131-153` |
| D4 | Filtro global devolve mensagem interna do Prisma no 500 | Médio | **Persiste** | `PUT /settings/frequency/FOO` e `/conveyor` → 500 com ``Invalid `this.prisma.frequencySettings.upsert()` … settings.service.js:45:46`` e trecho do código | `backend/src/common/filters/http-exception.filter.ts:29-30`; `backend/src/settings/settings.controller.ts:36` |
| D5 | Configurações: 0 ou vazio vira "1" e libera Salvar; decimal truncado | Baixo | **Persiste** | `0` → campo 1 e Salvar habilitado; vazio → 1 e habilitado; `2.7` → 2 (`d02-settings-zero.png`). Nada foi salvo | `frontend/src/pages/Settings.tsx:122` |
| D6 | Erro ao salvar frequência sem a mensagem da API | Baixo | **Persiste** | Rastreado: o `catch` continua com o texto fixo. `apiErrorMessage` já existe em `lib/errors.ts`, mas não é usado aqui | `frontend/src/pages/Settings.tsx:59-61` |
| D7 | Alteração de frequência sem audit log | Baixo | **Persiste** | Rastreado: `SettingsService` não injeta `AuditService` | `backend/src/settings/settings.service.ts:40-49` |
| D8 | "Realizadas (mês)" diminui ao excluir equipamento | Baixo | **Persiste** | Concluir hoje → `completedThisMonth 29`; `DELETE /equipment` → **28** (`d8-cleanup.log`) | `backend/src/equipment/equipment.service.ts:151-155`; `maintenance.service.ts:228-243` |
| D9 | Rota inexistente deixa a tela em branco | Baixo | **Persiste** | Mesmo resultado do A10 | `frontend/src/App.tsx:39-60` |
| D10 | Mobile: sem menu mobile, sidebar fixa ocupa 20% | Baixo | **Mudou** | A sidebar recolhida ficou com **64 px** em vez de 80 px (16% em 390 px), sem scroll horizontal. Continua sem menu hambúrguer ou `Sheet`: só existe "Expandir menu" na própria barra (`d03-dashboard-390.png`) | `frontend/src/components/Layout.tsx:17`; `frontend/src/components/layout/sidebar.tsx:68` |
| D11 | Dois ícones de engrenagem na sidebar | Baixo | **Persiste** | `Cog` (Equipamentos) e `Settings` (Configurações) | `frontend/src/components/layout/nav.ts:21`, `:29` |
| D12 | Título da aba igual em todas as telas | Baixo | **Persiste** | `/`, `/equipment`, `/settings`, `/downtime` → "FPM - Factory Preventive Maintenance" | `frontend/index.html:11` (nenhum `document.title` em `src/`) |
| D13 | Aviso "Function components cannot be given refs" do `Button` | Baixo | **Corrigido** | `/equipment` sem o aviso no console; o menu "Ações" abre posicionado dentro da tela (bbox x=1254, y=209) | `frontend/src/components/ui/button.tsx` (`React.forwardRef`) |

---

## Detalhes dos que persistem ou mudaram

### Área A

### [CRÍTICO] A1: Rotação e revogação do refresh token não funcionam (Persiste)
- **Área / camada:** A. Autenticação / Backend
- **Onde:** `backend/src/auth/auth.service.ts:42`, `:89`, `:98`
- **Como reproduzir:** `POST /auth/refresh {R1}` → 201 (R2). `POST /auth/refresh {R1}` de novo → 201. Variante: `logout` do user → `refresh UR1` → 401 → novo login do user (pela tela) → `refresh UR1` → 201.
- **Esperado:** 401 no reuso e no token emitido antes do logout.
- **Obtido:** 201 nos dois casos (`a-api.log`, `ui-a.log`). `R1.slice(0,72) === R2.slice(0,72)` → `true`.
- **Causa provável:** código inalterado. O bcrypt compara só os 72 primeiros bytes, que são iguais para todos os JWTs do mesmo usuário.
- **Sugestão de correção:** guardar `sha256(token)` ou um `jti` aleatório e comparar com `timingSafeEqual`.

### [ALTO] A2: O limite de 5 logins/min não é aplicado (Persiste)
- **Área / camada:** A. Autenticação / Backend
- **Onde:** `backend/src/auth/auth.controller.ts:15` (`@Throttle({ default: … })`), `:29` (`@SkipThrottle()`); `backend/src/app.module.ts:28-47`
- **Como reproduzir:** 7 `POST /auth/login` com senha errada e 1,2 s de intervalo.
- **Esperado:** 429 na 6ª tentativa.
- **Obtido:** 7× 401. Headers `x-ratelimit-limit-short: 10`, `medium: 100`, `long: 1000`. O `/auth/refresh` também devolve headers de rate limit (o `SkipThrottle` não tem efeito).
- **Causa provável:** os throttlers registrados se chamam `short`/`medium`/`long`, e o override usa `default`.
- **Sugestão de correção:** `@Throttle({ medium: { limit: 5, ttl: 60000 } })` e `@SkipThrottle({ short: true, medium: true, long: true })`.

### [ALTO] A4: O frontend não usa o refresh token (Persiste)
- **Área / camada:** A. Autenticação / Frontend
- **Onde:** `frontend/src/contexts/AuthContext.tsx:41-46`, `frontend/src/types/index.ts:109-112`, `frontend/src/services/api.ts:38-52`
- **Como reproduzir:** sessão válida em `/equipment`; trocar `localStorage.token` por um JWT expirado e clicar em "Dashboard".
- **Esperado:** `POST /auth/refresh`, repetir a requisição e manter o usuário na tela.
- **Obtido:** 5× 401 (10 requests por causa do StrictMode), nenhum `/auth/refresh`, reload para `/login?from=%2F` e nenhum toast (`a03-token-expirado.png`). Melhorou num ponto: agora o destino é preservado (A7). Mas a sessão continua caindo a cada 15 min, com perda do formulário em andamento.
- **Sugestão de correção:** guardar o `refresh_token` e, no interceptor, fazer um refresh único com fila (depende do A1).

### [MÉDIO] A5: Toda falha de login aparece como "Email ou senha inválidos" (Persiste)
- **Área / camada:** A. Autenticação / Frontend
- **Onde:** `frontend/src/pages/Login.tsx:40-41` (`catch {}` sem olhar o status)
- **Como reproduzir:** `page.route('**/auth/login')` → 429 com `retry-after: 60`; depois, um erro de rede.
- **Obtido:** nos dois casos o toast é "Email ou senha inválidos" (`a07-login-429-mock.png`). O `apiErrorMessage` (`lib/errors.ts`) já existe e não é usado aqui.
- **Sugestão de correção:** diferenciar 401, 429 (com `Retry-After`), 400 e rede/5xx.

### [MÉDIO] A6: A tela de login exibe a senha do administrador (Persiste)
- **Onde:** `frontend/src/pages/Login.tsx:96-99`
- **Obtido:** "Usuário de teste admin@fpm.com · admin123" sempre visível (`a01-login-sem-sessao.png`).
- **Sugestão de correção:** exibir só sob flag de demo.

### [BAIXO] A8 a A15 (Persistem, código inalterado)
- **A8:** `AuthContext.tsx:24`. `JSON.parse` sem try/catch; tela branca permanente (`a06-user-corrompido.png`).
- **A9:** `App.tsx:40`. `/login` sem guard inverso (`a04-login-logado.png`).
- **A10:** `App.tsx:39-60`. Sem `<Route path="*">` (`a05-rota-inexistente.png`).
- **A11:** `jwt.strategy.ts:21-23`, `:32`. Sem filtro `deletedAt` e usa `payload.role`.
- **A12:** `auth.service.ts:29-37` não registra falha de login (7 tentativas, 0 linhas); `:116-121` grava o `LOGOUT` sem IP/UA (confirmado no banco).
- **A13:** `auth.service.ts:29-31`. 40 ms (existe) × 4 ms (não existe).
- **A14:** `auth.controller.ts:14`, `:28`, `:37` respondem 201 e o Swagger diz 200. O email é case-sensitive (`login.dto.ts:6-8` sem normalização). Segredos em `docker-compose.yml:47-48`.
- **A15:** `auth.service.ts:110-124`. Após o logout, `/auth/me` → 200 (JWT stateless; registro só para ciência).

### Área C

### [MÉDIO] C4: `concludedAt` aceita futuro distante e passado arbitrário (Persiste)
- **Área / camada:** C. Manutenções / Backend + Frontend
- **Onde:** `backend/src/maintenance/dto/complete-maintenance.dto.ts:135-137`, `backend/src/maintenance/maintenance.service.ts:146-148`, `frontend/src/pages/MaintenanceRegister.tsx:278-283`
- **Como reproduzir:** `POST /maintenance/:id/complete` (USER) com checklist completo e `concludedAt: "2030-01-01T10:00:00.000Z"`; depois concluir a próxima com `concludedAt: "2026-01-01T10:00:00.000Z"`.
- **Esperado:** 400 para data futura; limite inferior razoável.
- **Obtido:** 201 nas duas. A próxima ficou em 2030-01-16 e, depois, em 2026-01-16, uma data anterior à criação da própria manutenção e já vencida. O input `datetime-local` não tem `max` (`getAttribute('max') = null`).
- **Sugestão de correção:** validar `concludedAt <= agora + tolerância` (a decisão 2.9 já usa 5 min para paradas) e com um limite inferior; `max` no input.

### [MÉDIO] C6: Autoria da manutenção (Mudou: audit corrigido, autoria visível não)
- **Onde:** `backend/src/maintenance/maintenance.service.ts:205-219` (audit, ok); `backend/prisma/schema.prisma:89-114`; `frontend/src/pages/EquipmentDetail.tsx:285-293`
- **Obtido:** `audit_logs` tem `UPDATE / Maintenance / df09d532… / userId = user@fpm.com`, o que corrige a parte de auditoria. Mas o registro retornado e o `by-equipment` não têm campo de autor, e o histórico não mostra "executada por". Para saber quem executou, só consultando o banco.
- **Sugestão de correção:** `completedById` no modelo e uma coluna "Responsável" no histórico.

### [MÉDIO → BAIXO] C7 / D2: Fuso de "hoje" (Mudou)
- **Área / camada:** C/D / Backend + Frontend
- **Onde:** `docker-compose.yml:52` (`TZ: America/Sao_Paulo`, correção); `frontend/src/lib/format.ts:19-26` (`isOverdue` no fuso do navegador); usado em `Dashboard.tsx:101` e `EquipmentDetail.tsx:228`, `:297`
- **Como reproduzir:** às 00:04 BRT de 25/10 (= 23:04 de 24/10 em Manaus), uma manutenção com `dueDate 2026-10-25T02:00Z` (24/10 23:00 BRT). Abrir Dashboard e detalhe com o navegador em São Paulo e depois em Manaus.
- **Obtido:**
  - API: o item está em `/overdue` e não em `/upcoming` (correto para o fuso da fábrica).
  - Navegador em São Paulo: na tabela "Manutenções vencidas", data **em vermelho**; detalhe "Vencida". Coerente, e o cenário original do achado está corrigido.
  - Navegador em Manaus (fuso da máquina do autor, segundo a área C): o mesmo item aparece em "Manutenções vencidas" com a data **em amarelo**, e o detalhe diz **"Agendada"**. O KPI "Vencidas" o conta. Num caso simétrico (`dueDate 25/10 03:30Z`), API e telas concordam.
- **Causa provável:** o backend usa o fuso fixo, e o front ainda calcula "vencida" pelo relógio do navegador. A janela de divergência caiu de 3 a 4 h para 1 h (a diferença Manaus × Brasília), mas não sumiu.
- **Sugestão de correção:** o backend devolver o status efetivo (`OVERDUE`/`UPCOMING`), ou o front calcular com `timeZone: 'America/Sao_Paulo'` explícito.

### [MÉDIO] C8 / D1: Equipamento inativo nos alertas, KPIs e reagendamento (Persiste)
- **Área / camada:** C/D / Backend
- **Onde:** `backend/src/maintenance/maintenance.service.ts:61-63`, `:85-87`, `:261-263`, `:279-281` (filtro só `equipment.deletedAt`); `backend/src/equipment/equipment.service.ts:120-140`; `frontend/src/pages/Dashboard.tsx:136` (Total = só ativos)
- **Como reproduzir:** `PATCH /equipment/:id/toggle-status` no `[REVIEW-R] inactive PANEL` → INACTIVE; `GET /maintenance/upcoming?days=36500`; `POST …/complete`. Repetir com o `tz MOTOR` (vencido) e comparar `stats` antes e depois.
- **Obtido:** o inativo continua em `upcoming` (`equipment.status: INACTIVE`); `complete` → 201 e reagenda (2026-12-24). Depois de inativar o vencido, `stats.overdue` não muda, `/overdue` continua listando o item, e `GET /equipment?status=ACTIVE` não o conta.
- **Sugestão de correção:** `equipment: { deletedAt: null, status: 'ACTIVE' }` nas consultas e contagens (vale também para `openCorrectives`, `:291-298`).

### [MÉDIO] C9 / D4: Validação de `days` e vazamento de erro interno no 500 (Persiste)
- **Onde:** `backend/src/maintenance/maintenance.controller.ts:37`; `backend/src/common/filters/http-exception.filter.ts:29-30`; `backend/src/settings/settings.controller.ts:36`
- **Como reproduzir / obtido:**
  | Request | Status | Resultado |
  |---|---|---|
  | `upcoming?days=-5` | 200 | `[]` |
  | `upcoming?days=abc` | 200 | mesma lista de `days=3` (default) |
  | `upcoming?days=` | 200 | mesma lista de `days=0`: o vazio vira 0, e não o default 3 como dizia o relatório original |
  | `upcoming?days=99999999` / `99999999999` | **500** | `message` com ``Invalid `this.prisma.maintenance.findMany()` invocation in /app/dist/maintenance/maintenance.service.js:45:40`` e trecho do código |
  | `PUT /settings/frequency/FOO` e `/conveyor` | **500** | ``Invalid `this.prisma.frequencySettings.upsert()` … settings.service.js:45:46`` |
- **Sugestão de correção:** DTO de query com `@IsInt() @Min(0) @Max(365)`; `ParseEnumPipe(EquipmentType)` no `:type`; no filtro, "Internal server error" para erros não-HTTP.

### [BAIXO] C10: Checklist registrado na interface (Mudou)
- **Onde:** `frontend/src/pages/EquipmentDetail.tsx:59-73`, `:311`
- **Obtido:** o histórico mostra o resumo ("3 OK", "1 Não OK · 1 N.A."), e o tooltip lista só os NOK com nota. Os itens OK/N.A. não podem ser consultados individualmente, e as observações continuam truncadas (`max-w-xs truncate`, texto completo só no `title`, que não funciona no celular).
- **Sugestão de correção:** linha expansível ou diálogo "Ver registro".

### [BAIXO] C11: Histórico mistura concluídas e agendadas (Persiste)
- **Onde:** `backend/src/equipment/equipment.service.ts:79-81` (`orderBy dueDate desc`); `frontend/src/pages/EquipmentDetail.tsx:296`
- **Obtido:** em `tz MOTOR`, a concluída (prevista 24/11/2026) aparece acima da agendada vencida (24/10/2026) (`c04-detalhe-tz.png`). Com corretivas no histórico, a mistura tende a piorar.

### [BAIXO] C12: Data de conclusão vazia (Persiste, agora sem nenhum feedback)
- **Onde:** `frontend/src/pages/MaintenanceRegister.tsx:103` (preventiva) e `:115` (corretiva)
- **Como reproduzir:** tela de registro → "Pendentes como OK" → apagar "Data/hora da conclusão" → "Registrar preventiva".
- **Esperado:** "Informe a data de conclusão" ou usar "agora".
- **Obtido:** `pageerror: Invalid time value` (exceção não tratada), **nenhum toast** e nada enviado (`c02-data-vazia.png`). Antes aparecia ao menos o toast genérico.
- **Causa provável:** o `new Date('').toISOString()` passou a ser montado **fora** do `try` em `handleSubmit`.
- **Sugestão de correção:** `concludedAt ? new Date(concludedAt).toISOString() : undefined`, ou validar o campo antes.

### [BAIXO] C13: Endpoints auxiliares respondem 200 para entradas inválidas (Persiste)
- **Onde:** `backend/src/maintenance/maintenance.controller.ts:58-63`, `:68-70`
- **Obtido:** `checklist/FOO` e `checklist/motor` → 200 `{"items":[]}`; `by-equipment/00000000-…` → 200 `[]`.

### [BAIXO] C15: Pequenas inconsistências de feedback (Mudou)
- **Onde:** `frontend/src/pages/MaintenanceRegister.tsx:53`, `:56-75`; `frontend/src/main.tsx:11`; `frontend/Dockerfile` (`npm run dev`)
- **Obtido:** o 201 do `complete` agora é o documentado no Swagger (`maintenance.controller.ts:82`), então essa parte está corrigida. Registro inexistente continua mostrando **2 toasts** "Erro ao carregar manutenção" (`c03-registro-404.png`), e a data padrão continua sendo a da abertura da página.

### Área D

### [MÉDIO] D3: Dashboard sem estado de erro (Persiste)
- **Área / camada:** D. Dashboard / Frontend
- **Onde:** `frontend/src/pages/Dashboard.tsx:131-153` (`Promise.all` + `console.error`)
- **Como reproduzir:** `page.route('**/maintenance/stats')` → 500; abrir `/` como admin.
- **Esperado:** mensagem de erro e o que carregou continua visível.
- **Obtido:** os 5 KPIs ficam em 0 (inclusive "Total de equipamentos" e o novo "Corretivas abertas"); gráfico "Sem dados"; tabelas "Nenhuma manutenção vencida"; nenhum toast (`d01-dashboard-stats-500.png`). Agora são 5 chamadas (`downtime?open=true` entrou no `Promise.all`), então há mais pontos de falha que zeram tudo.
- **Sugestão de correção:** `Promise.allSettled` e estado de erro com "tentar novamente".

### [BAIXO] D5: Configurações: 0 ou vazio vira 1 (Persiste)
- **Onde:** `frontend/src/pages/Settings.tsx:122` (`parseInt(e.target.value) || 1`)
- **Obtido:** `0` → 1 e Salvar habilitado; vazio → 1 e Salvar habilitado; `2.7` → 2 (`d02-settings-zero.png`). Nada foi salvo; o valor continuou 15.

### [BAIXO] D6, D7, D8, D9, D11, D12 (Persistem, código inalterado)
- **D6:** `Settings.tsx:59-61`. O toast é fixo, e `apiErrorMessage` (já usado no registro de manutenção) não é aproveitado.
- **D7:** `settings.service.ts:40-49`. `upsert` sem `AuditService`.
- **D8:** `equipment.service.ts:151-155` faz soft delete de **todas** as manutenções; `maintenance.service.ts:228-243` filtra `deletedAt`. Reproduzido: `completedThisMonth` 29 → 28 ao excluir o equipamento. Com o novo modelo, as corretivas e o histórico usados nos indicadores (Fase 3) também somem ao excluir o equipamento.
- **D9:** `App.tsx:39-60`. Igual ao A10.
- **D11:** `nav.ts:21` (`Cog`) e `:29` (`Settings`).
- **D12:** `index.html:11`. Nenhuma tela define `document.title`.

### [BAIXO] D10: Mobile sem menu próprio (Mudou)
- **Onde:** `frontend/src/components/Layout.tsx:17` (`pl-16 sm:pl-20`), `frontend/src/components/layout/sidebar.tsx:68` (`w-16 sm:w-20`)
- **Obtido:** em 390 px, a sidebar recolhida tem 64 px (antes 80), sem scroll horizontal (`scrollWidth = 390`). Ainda não há menu hambúrguer ou `Sheet`: a barra continua fixa, ocupando 16% da largura (`d03-dashboard-390.png`). A melhoria atende a decisão 4.7 (checklist em ~400 px), mas o achado de usabilidade continua.

---

## Regressões observadas

### [BAIXO] Registro com data de conclusão vazia passou a falhar em silêncio
- **Área / camada:** C. Manutenções / Frontend
- **Onde:** `frontend/src/pages/MaintenanceRegister.tsx:103`, `:115`
- **Obtido:** antes, o `RangeError` era capturado e aparecia o toast "Erro ao registrar manutenção". Na reescrita para o checklist OK/NOK/NA, a montagem do DTO saiu de dentro do `try`. Agora a exceção não é tratada (`pageerror: Invalid time value`) e o usuário não recebe nenhum retorno ao clicar em "Registrar preventiva" ou "Concluir corretiva" (`c02-data-vazia.png`). Detalhe no C12.

Nenhuma outra regressão foi observada nos fluxos retestados. O login com senha errada, a volta ao destino após o login, o 409 na tela, a concorrência e o menu "Ações" se comportaram como esperado.
