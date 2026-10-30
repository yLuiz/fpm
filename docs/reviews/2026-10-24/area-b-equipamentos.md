# Revisão funcional — Área B. Equipamentos

> **Objetivo:** registrar o resultado da revisão funcional da área B (equipamentos: CRUD, ativar/desativar, exclusão, filtros, auditoria, lista, formulário e detalhe), com prioridade no menu "Ações" da lista.
> **Categoria:** reviews · **Status:** Concluído
> **Atualizado em:** 2026-10-24
> **Relacionados:** [Padrão de revisão funcional](../../process/padrao-revisao-funcional.md) · [Decisões da implementação](../../plans/decisoes-funcionalidades.md) · [Área C](area-c-manutencoes.md) · [Área D](area-d-dashboard-config.md)

- **Ambiente:** API `http://localhost:3001` (`fpm-backend`) e frontend `http://localhost:5173` (`fpm-frontend`, Vite dev). Os dois containers foram recriados às 22:59 (UTC-4) por quem coordena, antes destes testes. Não reiniciei nada e não alterei código.
- **Código servido ao navegador:** conferido com `curl http://localhost:5173/src/components/ui/button.tsx`. O arquivo servido já tem `React.forwardRef`, ou seja, a correção 5.1 das decisões.
- **Navegador:** Chromium headless (Playwright), em 1440×900 e 390×844, com sessão injetada no `localStorage` (`token`, `user`). Fiz um login por usuário.
- **Dados de teste:** 9 equipamentos `[REVIEW-B] …` (mais um com nome só de espaços, criado de propósito para testar a validação). Todos foram **excluídos no fim** (soft delete), e nenhum ficou como evidência na base. Ficaram no banco, invisíveis nas listas: duas paradas `[REVIEW-B]` presas a equipamentos excluídos e os registros de auditoria.
- **Evidências** (scripts, logs e screenshots):
  `C:\Users\LUIZ\AppData\Local\Temp\claude\e--Estudos-ProjetosPessoais-Descomplica\57045645-c400-4d0a-90e7-53fb4f2bb27a\scratchpad\e2e\area-b\`
  - `api1.mjs`, `api2.mjs`, `api3.mjs`, `fin.mjs`: testes de API
  - `ui1.mjs`: menu de ações. Gera `admin-1440.log`, `user-1440.log`, `admin-390.log` e, no modo `sim`, `admin-1440-sim.log`
  - `ui2.mjs` (gera `ui2.log`): filtros, formulário, detalhe, IDs inexistentes e API fora do ar
  - `ui3.mjs`: mobile 390px
  - Screenshots `*.png` com o mesmo prefixo

---

## Menu "Ações" da lista (relato do usuário)

**Resultado no build atual:** o menu **funciona**. Testei com ADMIN e USER, em 1440px e 390px, com mouse e com teclado (Enter). O menu abre ao lado do botão, por exemplo em `translate(1254px, 470px)`. As três opções funcionam:
- **Ver detalhes** abre `/equipment/:id`.
- **Editar** abre `/equipment/:id/edit`.
- **Desativar/Ativar** abre o diálogo de confirmação. O botão "Cancelar" fecha o diálogo e a página continua clicável (`body` com `pointer-events: auto`). O botão "Confirmar" chama `PATCH /toggle-status`, que responde 200, mostra o toast e atualiza o status na linha.

Evidências: `admin-1440.log`, `admin-1440-02-menu.png`, `admin-1440-03-dialog.png`, `admin-1440-04-after-toggle.png`.

**Causa do defeito relatado (confirmada):** antes da decisão 5.1, `frontend/src/components/ui/button.tsx` era um componente de função sem `forwardRef`. É o estilo do React 19, mas o projeto usa React 18. No React 18 a `ref` não chega como prop. Em `EquipmentList.tsx:180-185`, o `DropdownMenuTrigger asChild` passa uma ref para o `<Button>`. Essa ref é descartada, e aparece o aviso *"Function components cannot be given refs… Check the render method of `Primitive.button.SlotClone` at Button"*. Sem a ref, o Radix/Floating UI não sabe onde está o botão. O menu abre (`data-state=open`, itens no DOM), mas fica **fora da tela**, preso em `transform: translate(0px, -200%)` (caixa em `y = -212`). Por isso nenhuma opção pode ser clicada.

Reproduzi o defeito sem tocar no código. O `ui1.mjs admin 1440 sim` intercepta só no navegador do teste o módulo `button.tsx` e troca o `React.forwardRef(...)` por um componente de função comum. Com isso, o menu volta a ficar fora da tela e os três cliques dão timeout (`admin-1440-sim.log`, `admin-1440-sim-02-menu.png`). O screenshot `admin-02-menu-open-invisible.png`, da tentativa anterior às 16:18 (antes da correção, das 17:05), mostra o mesmo sintoma: botão ativo e nenhum menu visível.

**Outros pontos com a mesma causa** (busca por `asChild` e por componentes do shadcn que recebem ref do Radix, em `frontend/src`):

| Local | Recebe ref de um gatilho/Presence do Radix? | Afetado |
|---|---|---|
| `pages/EquipmentList.tsx:180` `DropdownMenuTrigger asChild > Button` | Sim. É o único gatilho `asChild` com `Button` como filho | **Sim** (corrigido pela 5.1) |
| `components/ui/alert-dialog.tsx:56` `AlertDialogPortal > AlertDialogOverlay` | Sim. O Portal/Presence do Radix clona o overlay com ref | **Sim, ainda hoje.** Ver o achado BAIXO abaixo |
| `components/layout/sidebar.tsx:24` `TooltipTrigger asChild > Link` | Sim, mas o `Link` do react-router já repassa a ref | Não |
| `pages/EquipmentList.tsx:187,193` `DropdownMenuItem asChild > Link` | Sim, `Link` repassa a ref | Não |
| `ui/alert-dialog.tsx:158,176` `Button asChild > AlertDialogPrimitive.Action/Cancel` | Não. O `Button` é o pai, e o filho Radix repassa a ref | Não |
| `ui/sheet.tsx:70` `SheetPrimitive.Close asChild > Button` | Seria afetado sem a 5.1, mas o `Sheet` não é usado em nenhuma tela | Não (código morto) |
| `ui/select.tsx:52` `SelectPrimitive.Icon asChild > ícone lucide` | Ícones lucide repassam a ref | Não |
| Demais `Button asChild > Link` (Dashboard, EquipmentDetail, EquipmentForm, EquipmentScan, MaintenanceRegister, EquipmentList) | Não. O `Button` é o pai | Não |
| `ui/badge.tsx` (`asChild` próprio) | Não é filho de gatilho Radix | Não |

---

## Achados

### [MÉDIO] Equipamento desativado continua nos alertas, nos KPIs e nos indicadores
- **Área / camada:** B. Equipamentos / Backend (efeito no Dashboard)
- **Onde:** `backend/src/maintenance/maintenance.service.ts:45-64` (`findUpcoming`), `:74-96` (`findOverdue`), `:245-284` (`countUpcoming`/`countOverdue`) e `:286-299` (`getDashboardStats`) filtram só `equipment.deletedAt`, sem olhar `status`; `backend/src/metrics/metrics.service.ts:34-43` conta as paradas de inativos, mas `equipmentCount` só conta `ACTIVE`; `backend/src/downtime/downtime.service.ts:29-33` aceita parada em equipamento inativo.
- **Como reproduzir:**
  1. Criar um equipamento e registrar uma parada com início 3 dias atrás e `openCorrective: true`. A corretiva vence em 1 dia, então fica vencida. Encerrar a parada.
  2. `PATCH /equipment/:id/toggle-status` → `INACTIVE`.
  3. `GET /maintenance/overdue`, `GET /maintenance/upcoming?days=40`, `GET /maintenance/stats`, `GET /metrics/summary`.
- **Esperado:** o diálogo da tela diz que o equipamento "deixará de aparecer nas listas de ativos". Manutenções e paradas dele não deveriam cobrar prazo nem pesar nos indicadores, ou deveriam pesar de forma coerente com o denominador.
- **Obtido:**
  - A corretiva do inativo aparece em `/maintenance/overdue` (`equipment.status: "INACTIVE"`), e a preventiva dele aparece em `/upcoming`.
  - Ao excluir esse equipamento, os KPIs caíram de `overdue 7 → 6` e `openCorrectives 11 → 10`.
  - Os indicadores somavam a parada do inativo (`downtime.count 12 → 11`, `totalMinutes 5329 → 1009`, ou seja, −4320 min) sem contar o equipamento em `equipmentCount`. Isso distorce disponibilidade e MTBF.
  - A API aceitou abrir parada e corretiva no equipamento já inativo (201).
  - Log: `api2.mjs`, `api3.mjs`, `fin.mjs`.
- **Causa provável:** desativar só muda `equipment.status`. Nenhuma consulta de manutenção, KPI ou indicador filtra por `status: 'ACTIVE'`, e `downtime.create` não verifica o status. A área C reportou a parte de alertas e reagendamento (`area-c-manutencoes.md`, "Equipamento inativo continua com manutenções…"). Aqui a confirmação vem pela ação de desativar e inclui KPIs e indicadores.
- **Sugestão de correção:** decidir a regra (sugestão: inativo sai de alertas, KPIs e indicadores, e não aceita parada nova) e aplicar `equipment: { deletedAt: null, status: 'ACTIVE' }` nas consultas. Ou então mudar o texto do diálogo para não prometer o que o sistema não faz.

### [MÉDIO] Qualquer usuário (USER) pode criar, editar, desativar e excluir equipamentos
- **Área / camada:** B. Equipamentos / Backend + Frontend
- **Onde:** `backend/src/equipment/equipment.controller.ts:28` (só `JwtAuthGuard`, sem `RolesGuard`/`@Roles`), `:77-83` (DELETE); `frontend/src/pages/EquipmentList.tsx:109-114, 179-204` (botão "Novo equipamento" e menu de ações sem checar o perfil).
- **Como reproduzir:** com o token de `user@fpm.com`:
  - `POST /equipment` → 201
  - `PATCH /equipment/:id` → 200
  - `PATCH /equipment/:id/toggle-status` → 200
  - `DELETE /equipment/:id` → 200 (excluiu um equipamento criado pelo ADMIN)
  - Na tela, o USER vê e usa "Novo equipamento", "Editar" e "Desativar" (`user-1440.log`).
- **Esperado:** a regra de perfis não está escrita na spec, mas o próprio sistema já restringe Configurações a ADMIN (`settings.controller.ts:30-31`). Excluir esconde o equipamento e **todas** as manutenções dele de todas as telas, e não existe tela para desfazer.
- **Obtido:** nenhuma restrição. A auditoria registra quem fez (`audit_logs` com `user@fpm.com` em CREATE, UPDATE e DELETE).
- **Causa provável:** o controller não usa `RolesGuard`.
- **Sugestão de correção:** definir a regra de domínio. Sugestão: só ADMIN exclui (e talvez desativa); USER cria e edita, ou só consulta. Aplicar `@UseGuards(RolesGuard) @Roles(ADMIN)` nas rotas escolhidas e esconder as ações correspondentes no front.

### [MÉDIO] Filtro `status` inválido responde 500 e vaza a query do Prisma
- **Área / camada:** B. Equipamentos / Backend
- **Onde:** `backend/src/equipment/equipment.controller.ts:45` (`@Query('status')` sem validação) e `equipment.service.ts:36-40`; o vazamento vem de `backend/src/common/filters/http-exception.filter.ts:29-30`.
- **Como reproduzir:** `GET /equipment?status=FOO` ou `GET /equipment?status=active` (minúsculo).
- **Esperado:** 400 com mensagem do tipo "status deve ser ACTIVE ou INACTIVE".
- **Obtido:** `500` com `message: "\nInvalid \`this.prisma.equipment.findMany()\` invocation in\n/app/dist/equipment/equipment.service.js:42:38 …"`, que expõe o caminho interno e a query (`api1.mjs`).
- **Causa provável:** o valor da query vai direto para o `where` do Prisma, e o filtro global devolve `exception.message` de qualquer `Error`.
- **Sugestão de correção:** usar `new ParseEnumPipe(EquipmentStatus, { optional: true })` no parâmetro e, no filtro global, responder "Internal server error" para exceções que não sejam `HttpException`. O mesmo problema aparece em `/maintenance/upcoming?days=`, reportado pela área C.

### [BAIXO] Trocar o tipo do equipamento não reagenda a preventiva pendente
- **Área / camada:** B. Equipamentos / Backend
- **Onde:** `backend/src/equipment/equipment.service.ts:99-118` (`update`)
- **Como reproduzir:** criar MOTOR (30 dias) → `PATCH {type:'PANEL'}` (60 dias). Também pela tela: criar Compressor (15 dias) e editar para Painel Elétrico.
- **Esperado:** decidir se a preventiva agendada passa a seguir a frequência do novo tipo, ou pelo menos avisar o usuário.
- **Obtido:** o `dueDate` não muda (`2026-11-24T03:01:57Z` antes e depois). Na tela, o detalhe mostra "Painel Elétrico" com a próxima preventiva em 08/11 (+15 dias, frequência do Compressor) (`m390-detail.png`). O checklist que será cobrado passa a ser o do novo tipo, mas o prazo continua sendo o do tipo antigo.
- **Causa provável:** `update` só grava os campos. Nada recalcula a agenda.
- **Sugestão de correção:** quando `type` mudar, recalcular o `dueDate` da preventiva `SCHEDULED` (a partir da última conclusão ou da criação) ou mostrar um aviso no formulário.

### [BAIXO] Nome e localização aceitam só espaços e tamanho ilimitado
- **Área / camada:** B. Equipamentos / Backend + Frontend
- **Onde:** `backend/src/equipment/dto/create-equipment.dto.ts` (`@IsNotEmpty` sem trim, sem `@MaxLength`); `frontend/src/pages/EquipmentForm.tsx:107-113, 134-140` (só `required`).
- **Como reproduzir:** `POST /equipment {name:'   ', location:'   ', …}` → 201. Nome com 5.000 caracteres → 201. Na tela, o campo com espaços passa na validação do navegador (`validationMessage` vazio).
- **Esperado:** 400 para texto em branco e um limite razoável (ex.: 120 caracteres).
- **Obtido:** o equipamento sem nome aparece na lista como um link vazio. O nome de 5.000 caracteres deixou a tabela com `scrollWidth` de 40.338 px (as células usam `whitespace-nowrap`), empurrando a coluna "Ações" para fora do alcance (`api1.mjs`, `ui3.mjs`, 1ª execução).
- **Sugestão de correção:** `@Transform(trim)` + `@IsNotEmpty` + `@MaxLength` no DTO, e `maxLength`/trim no formulário.

### [BAIXO] Erro de API vira "Sem dados" na lista e "não encontrado" no detalhe
- **Área / camada:** B. Equipamentos / Frontend
- **Onde:** `frontend/src/pages/EquipmentList.tsx:58-67, 130-135`; `frontend/src/pages/EquipmentDetail.tsx:91-100, 115-123`
- **Como reproduzir:** bloquear as chamadas a `/equipment` (simula API fora do ar ou 500) e abrir `/equipment` e `/equipment/:id` de um equipamento que existe.
- **Esperado:** um estado de erro ("Não foi possível carregar…" com opção de tentar de novo), diferente de lista vazia e de 404.
- **Obtido:**
  - Lista: toast de erro, mas o card mostra "Sem dados — Nenhum equipamento encontrado para o filtro atual" (`ui2-list-api-down.png`).
  - Detalhe: "Equipamento não encontrado", **sem toast**, para qualquer erro, até de rede (`ui2.log`).
- **Causa provável:** o `catch` só registra no console (e mostra toast na lista). O estado continua `[]`/`null` e cai no mesmo ramo de "vazio".
- **Sugestão de correção:** guardar um estado `error` e mostrar um `EmptyState` de erro. No detalhe, diferenciar 404 dos outros erros.

### [BAIXO] Editar com ID inexistente mostra um formulário em branco que pode ser enviado
- **Área / camada:** B. Equipamentos / Frontend
- **Onde:** `frontend/src/pages/EquipmentForm.tsx:42-58`
- **Como reproduzir:** abrir `/equipment/abc/edit` (ou o link de um equipamento excluído), preencher e salvar.
- **Esperado:** "Equipamento não encontrado" com link para voltar, como no detalhe.
- **Obtido:** título "Editar equipamento", campos com os valores padrão (Motor/Média), toast "Erro ao carregar equipamento". Ao salvar, `PATCH /equipment/abc` → 404 e toast genérico "Erro ao salvar equipamento" (`ui2-edit-404.png`, `ui2.log`).
- **Sugestão de correção:** guardar `notFound` no `catch` do `loadEquipment` e mostrar o estado vazio no lugar do formulário. Mostrar a mensagem da API nos toasts.

### [BAIXO] `AlertDialogOverlay` sem `forwardRef`: aviso no console e overlay sem animação de saída
- **Área / camada:** B. Equipamentos / Frontend (componente compartilhado)
- **Onde:** `frontend/src/components/ui/alert-dialog.tsx:31-46` (definição) e `:56` (uso dentro de `AlertDialogPortal`)
- **Como reproduzir:** na lista, Ações → Desativar.
- **Esperado:** console limpo.
- **Obtido:** `Warning: Function components cannot be given refs… Check the render method of 'Primitive.div.SlotClone' at AlertDialogOverlay` (em todas as execuções: `admin-1440.log`, `user-1440.log`, `admin-390.log`). O Portal/Presence do Radix não recebe o nó do overlay. Ao fechar, o overlay some de uma vez, sem o `fade-out` (o conteúdo anima e o fundo não). Não bloqueia a interação: depois de Cancelar ou Confirmar, a página continua clicável.
- **Causa provável:** a mesma da 5.1 (componente shadcn no estilo React 19 rodando em React 18). A correção cobriu só o `Button`. O `Dialog` (`ui/dialog.tsx`) não tem o problema, porque usa `DialogPrimitive.Overlay` direto.
- **Sugestão de correção:** `React.forwardRef` no `AlertDialogOverlay`, ou usar `AlertDialogPrimitive.Overlay` direto dentro do `AlertDialogContent`. Vale um teste de regressão como o `button.test.tsx`.

### [BAIXO] No celular, a coluna "Ações" fica a ~700 px de rolagem horizontal, longe do nome
- **Área / camada:** B. Equipamentos / Frontend
- **Onde:** `frontend/src/pages/EquipmentList.tsx:137-209`
- **Como reproduzir:** 390×844, abrir `/equipment`.
- **Esperado:** acesso às ações sem perder de vista qual equipamento está sendo alterado.
- **Obtido:** a tabela tem 927 px dentro de uma área rolável de 260 px. O primeiro botão "Ações" fica em x = 975. Ao rolar até ele, a coluna "Nome" sai da tela, então o usuário desativa o equipamento sem ver o nome na linha (`admin-390-02-menu.png`). A página em si não tem rolagem horizontal, e o diálogo de confirmação mostra o nome, o que diminui o risco.
- **Sugestão de correção:** no mobile, esconder Tipo e Local, ou fixar a coluna de ações (`sticky right-0`), ou usar cards em vez da tabela.

---

## Observações (não são defeitos)

- **Não há "Excluir" nem "QR" no menu de ações.** O menu tem só Ver detalhes, Editar e Desativar/Ativar. A spec original (`docs/specs/mvp-requisitos-originais.md:70-71`) pede "listar, criar, editar, desativar", então a falta do excluir é coerente. O `equipmentApi.delete` existe em `services/api.ts` sem nenhum uso. O QR fica no topo da lista ("Etiquetas QR") e no detalhe ("Etiqueta QR"), e os dois funcionam.
- A 1ª preventiva usa o horário exato da criação (`dueDate = createdAt + N dias`, por exemplo `03:01Z`), e não o início do dia. Nas preventivas do seed o horário é `11:00Z`. Não muda o dia exibido nos testes, mas o horário fica diferente entre registros.

---

## O que foi testado e passou

| Item | Resultado |
|---|---|
| Menu "Ações" (ADMIN e USER, 1440 e 390, mouse e teclado): Ver detalhes, Editar, Desativar, Ativar | OK no build atual |
| Diálogo de desativar/ativar: título e texto corretos, Cancelar fecha sem travar a página, Confirmar chama a API, mostra o toast e atualiza a linha | OK |
| `POST /equipment`: 201; 1ª manutenção `PREVENTIVE/SCHEDULED` com `dueDate` = criação + frequência do tipo (MOTOR +30; COMPRESSOR +15 pela tela, 24/10 → 08/11) | OK |
| Validação: corpo vazio → 400 com mensagens em PT; enum inválido → 400; campo extra (`status`, `deletedAt`) → 400 (whitelist); `PATCH name:''` → 400; `PATCH type` inválido → 400 | OK |
| Sem token em GET/POST → 401 | OK |
| ID inexistente (UUID e texto) em GET, PATCH, toggle e DELETE → 404 com mensagem | OK |
| Filtro `?status=ACTIVE` / `INACTIVE` devolve só o status pedido; filtros Todos/Ativos/Inativos na tela batem com a API; "Parado" aparece em Ativos | OK |
| Exclusão: some de `GET /equipment`, `GET /equipment/:id` → 404, `by-equipment` → `[]`, manutenção → 404, sai de `upcoming`; excluir de novo, toggle, concluir manutenção e abrir parada em equipamento excluído → 404; parada aberta de equipamento excluído sai de `GET /downtime` | OK |
| Auditoria: CREATE, UPDATE (edição e toggle, com old/new status) e DELETE registrados com o usuário correto (`audit_logs`) | OK |
| Formulário: submit vazio barrado pelo navegador; criar → toast "Equipamento criado" e volta para a lista; editar carrega os dados, salva, mostra toast e volta; Cancelar volta para a lista | OK |
| Detalhe: dados, próxima preventiva, histórico, botões Registrar parada (abre o diálogo), Etiqueta QR (`/equipment/labels?ids=…`), Editar, Registrar preventiva (`/maintenance/:id/register`) | OK |
| Detalhe com ID inexistente: "Equipamento não encontrado" com "Voltar para lista" | OK |
| Botões do topo da lista: "Etiquetas QR" → `/equipment/labels`, "Novo equipamento" → `/equipment/new` | OK |
| Mobile 390px: lista, detalhe e formulário sem rolagem horizontal da página; menu de ações posicionado dentro da tela | OK |

## Não confirmado

- Nada pendente. Todos os itens acima foram reproduzidos ou rastreados no código.
