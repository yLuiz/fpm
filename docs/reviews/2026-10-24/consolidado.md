# Revisão Funcional 2026-10-24 — Consolidado

> **Objetivo:** lista única, por severidade, dos problemas que continuam abertos após a 1ª rodada de revisão (áreas A–F + revalidação).
> **Categoria:** reviews · **Status:** Concluído
> **Atualizado em:** 2026-10-24
> **Relacionados:** [Padrão de revisão](../../process/padrao-revisao-funcional.md) · [A](area-a-auth.md) · [B](area-b-equipamentos.md) · [C](area-c-manutencoes.md) · [D](area-d-dashboard-config.md) · [E](area-e-corretivas-paradas.md) · [F](area-f-indicadores-qr.md) · [Revalidação](revalidacao.md)

## Resumo

| | Crítico | Alto | Médio | Baixo |
|---|---|---|---|---|
| **Abertos** | 0 | 2 | 9 | ~30 |
| **Corrigidos após a revisão** | 1 | 1 | — | — |

- As áreas A, C e D foram revisadas antes da implementação do [plano de funcionalidades](../../plans/plano-funcionalidades.md) e **revalidadas** depois: dos 43 achados, 8 corrigidos, 29 persistem, 6 mudaram.
- As áreas B, E e F foram revisadas já sobre o código final.
- O **botão de ações da lista de equipamentos funciona** no código atual (causa: `Button` sem `forwardRef`, corrigido na decisão 5.1; detalhes em [B](area-b-equipamentos.md)).
- Achados que apareceram em mais de uma área foram unificados; a coluna **Origem** aponta os IDs nos relatórios de área.

---

## Correções após a revisão

| # | Data | O que mudou | Verificação |
|---|---|---|---|
| 1 | 2026-10-24 | Refresh token guardado como SHA-256 do token inteiro (não mais bcrypt, que truncava em 72 bytes); `jti` aleatório em cada refresh token; rotação atômica (`updateMany` condicionado ao hash atual). Arquivo: `backend/src/auth/auth.service.ts` | `backend/test/e2e/auth.e2e-spec.ts` (5 testes: renovação, reuso → 401, duas renovações simultâneas → 201 + 401, logout invalida, token malformado) |
| 4 | 2026-10-24 | Frontend guarda o refresh token e, no 401, renova uma única vez (compartilhada entre requisições paralelas e tolerante a outra aba ter renovado antes) e repete a requisição; logout renova o access token se preciso para invalidar a sessão no backend. Arquivos: `frontend/src/services/api.ts`, `frontend/src/lib/token-storage.ts`, `frontend/src/contexts/AuthContext.tsx` | Vitest 44/44; navegador: token expirado → 1 renovação para as chamadas do dashboard, sem novo login; refresh inválido → login e volta à página; logout → refresh antigo 401 |

## Crítico

| # | Problema | Onde | Origem |
|---|---|---|---|
| 1 | ~~**Refresh token antigo continua válido** (reuso após rotação e após logout devolvem 201; bcrypt compara só os primeiros 72 bytes)~~ — **corrigido**, ver "Correções após a revisão" | `backend/src/auth/auth.service.ts` | A1 |

## Alto

| # | Problema | Onde | Origem |
|---|---|---|---|
| 2 | **Paradas simultâneas duplicadas:** 3 `POST /downtime` paralelos no mesmo equipamento abrem 3 paradas e 3 corretivas; horas contadas em dobro nos indicadores. | `backend/src/downtime/downtime.service.ts:41-46,55-79` | E |
| 3 | **Limite de 5 logins/min não é aplicado** (`@Throttle({ default })` não existe entre os throttlers `short/medium/long`; login aceita 100/min). | `backend/src/auth/auth.controller.ts:15,29` · `backend/src/app.module.ts:28-47` | A2 |
| 4 | ~~**Frontend não usa o refresh token:** sessão cai a cada 15 min sem tentar renovar~~ — **corrigido**, ver "Correções após a revisão" | `frontend/src/services/api.ts` · `frontend/src/contexts/AuthContext.tsx` | A4 |

## Médio

| # | Problema | Onde | Origem |
|---|---|---|---|
| 5 | **Equipamento inativo tratado de forma inconsistente:** continua em vencidas/a vencer e KPIs, é reagendado, aceita parada; nos indicadores a parada entra no numerador mas as horas saem do denominador. | `maintenance.service.ts:61-63,85-87,261-263,279-281` · `metrics.service.ts:19,34-43` · `downtime.service.ts:29-33` | C8, D1, B, E, F-02 |
| 6 | **Indicadores do passado mudam com o cadastro de hoje:** MTBF/disponibilidade multiplicam o período pela quantidade *atual* de equipamentos ativos (agosto: 6193 h com 25 equip., 7929 h com 32; correto ≈ 2473 h). | `backend/src/metrics/metrics.service.ts:43` · `metrics.calc.ts:85` | F-01 |
| 7 | **Paradas retroativas sem validação:** aceita parada sobreposta a outras encerradas e anterior à criação do equipamento; horas sobrepostas contam em dobro. | `downtime.service.ts:36-46` · `metrics.calc.ts:87` | E |
| 8 | **Erros 500 expõem a query do Prisma e caminhos internos** (`?status=FOO`, `days=99999999999`, tipo inválido em configurações). | `common/filters/http-exception.filter.ts:29-30` · `equipment.controller.ts:45` · `maintenance.controller.ts:37` · `settings.controller.ts:36` | B, C9, D4 |
| 9 | **Data de conclusão sem limites:** aceita anos futuros e passado arbitrário (corretiva concluída antes de ser criada). | `complete-maintenance.dto.ts:135-137` · `maintenance.service.ts:146-148` · `MaintenanceRegister.tsx:278-283` | C4, E |
| 10 | **Dashboard sem estado de erro:** se uma chamada falha, todos os KPIs mostram 0 e as tabelas dizem "nenhuma", sem aviso. | `frontend/src/pages/Dashboard.tsx:131-153` | D3 |
| 11 | **Erro 429 ou de rede aparece como "Email ou senha inválidos".** | `frontend/src/pages/Login.tsx:40-41` | A5 |
| 12 | **Senha do admin exibida na tela de login.** | `frontend/src/pages/Login.tsx:96-99` | A6 |
| 13 | **USER pode criar, editar, desativar e excluir equipamentos** (API e tela). Depende de decisão de domínio — ver abaixo. | `backend/src/equipment/equipment.controller.ts:28,77-83` · `EquipmentList.tsx` | B |

## Baixo

| Área | Problema | Onde |
|---|---|---|
| A | `localStorage.user` corrompido deixa tela branca (JSON.parse sem try/catch, sem Error Boundary) | `AuthContext.tsx:24` |
| A | `/login` acessível estando logado | `App.tsx:40` |
| A/D | Rota inexistente mostra página em branco (sem rota `*`) | `App.tsx:39-60` |
| A | JwtStrategy não filtra usuário excluído e confia no papel do token | `jwt.strategy.ts:21-23,32` |
| A | Login com falha não é auditado; LOGOUT sem IP/user-agent | `auth.service.ts:29-37,116-121` |
| A | Enumeração de e-mail pelo tempo de resposta (43 ms × 4 ms) | `auth.service.ts:29-31` |
| A | Login/refresh/logout respondem 201; e-mail diferencia maiúsculas; segredos JWT no `docker-compose.yml` | `auth.controller.ts:14,28,37` |
| A | Access token vale até 15 min após logout (comportamento de JWT, registrado para ciência) | `auth.service.ts:110-124` |
| B | Alertas de diálogo (`AlertDialogOverlay` sem `forwardRef`): aviso no console, fundo some sem animação | `components/ui/alert-dialog.tsx:31-46` |
| B | Trocar o tipo do equipamento não reagenda a preventiva pendente | `equipment.service.ts:99-118` |
| B | Nome/local aceitam só espaços e tamanho ilimitado (5.000 caracteres quebram a tabela) | `create-equipment.dto.ts` · `EquipmentForm.tsx:107-140` |
| B | Erro de API aparece como "Sem dados" / "Equipamento não encontrado" | `EquipmentList.tsx:58-67,130-135` · `EquipmentDetail.tsx:91-123` |
| B | Editar ID inexistente mostra formulário em branco | `EquipmentForm.tsx:42-58` |
| B | 390px: coluna "Ações" escondida na rolagem horizontal | `EquipmentList.tsx:137-209` |
| C | Histórico ordenado por data prevista | `equipment.service.ts:79-81` |
| C | **Regressão:** data de conclusão vazia falha em silêncio (`Invalid time value` fora do `try`) | `MaintenanceRegister.tsx:103,115` |
| C | `checklist/FOO` → 200 vazio; `by-equipment/<inexistente>` → 200 `[]` | `maintenance.controller.ts:58-63,68-70` |
| C | Executor não aparece no registro/histórico (só no audit log) | `EquipmentDetail.tsx` |
| C | Checklist só aparece resumido ("3 OK"); sem visão item a item | `EquipmentDetail.tsx` |
| C | ID inexistente no registro dispara 2 toasts; data padrão = hora de abertura da página | `MaintenanceRegister.tsx` |
| C/D | Fuso: navegador fora de São Paulo ainda mostra item vencido em amarelo (janela de 1 h) | `frontend/src/lib/format.ts:19-26` |
| D | Frequência 0/vazia vira 1 sozinha; decimal truncado | `Settings.tsx:122` |
| D | Erro ao salvar frequência não mostra o motivo da API | `Settings.tsx:59-61` |
| D | Alterar frequência não gera auditoria | `settings.service.ts:40-49` |
| D | "Realizadas (mês)" diminui ao excluir equipamento | `equipment.service.ts:151-155` |
| D | Celular: sem menu próprio (sidebar fixa de 64 px) | `Layout.tsx` · `sidebar.tsx` |
| D | Ícones quase iguais para Equipamentos e Configurações | `nav.ts:21,29` |
| D | Título da aba do navegador igual em todas as telas | `index.html:11` |
| E | Descrição de parada só com espaços aceita | `create-downtime.dto.ts:30` · `downtime.service.ts:53` |
| E | Data vazia nos diálogos de parada → toast genérico | `downtime-dialogs.tsx:73,194` |
| E | Corretiva aberta por parada aparece sob "Achados da preventiva" | `MaintenanceRegister.tsx:270` |
| E | Notas "Não OK" só em tooltip (inacessível no celular); sem vínculo preventiva ↔ corretiva no histórico | `EquipmentDetail.tsx:58-73` |
| E | 390px: filtro de Paradas passa 13 px da borda | `Downtimes.tsx:75-85` |
| E | Mensagens de validação em inglês nas rotas novas; "há X" do banner não atualiza | `Dashboard.tsx:203` |
| F | Excluir equipamento tira as paradas dele do histórico de indicadores | `metrics.service.ts:19` |
| F | Datas da API de métricas: `2026-02-31` aceito; `to` sem hora exclui o último dia | `metrics.controller.ts:11,16` · `metrics.service.ts:52-54` |
| F | Tela do QR mostra "não encontrado" para qualquer erro | `EquipmentScan.tsx:19` |
| F | QR de equipamento inativo abre o registro sem aviso | `frontend/src/lib/qr.ts:28-43` |
| F | Impressão das etiquetas com fundo escuro quando "gráficos de fundo" está ligado | `Layout.tsx:9` |

---

## Divergências em relação ao plano

- Filtro de período na página de Paradas: só existe na API.
- Histórico com ícones OK/NOK e vínculo preventiva ↔ corretiva: não implementado.
- Parâmetro `kind` em upcoming/overdue: não implementado (é ignorado).
- Campo `isDown` substituído por `downtimes` (decisão 2.10) — o texto do plano está desatualizado, o código é consistente.

## Decisões de domínio pendentes

1. **USER pode gerenciar equipamentos** (criar/editar/desativar/excluir) ou só ADMIN? (#13)
2. **"Realizadas (mês)" deve contar corretivas concluídas?**
3. **Prazo da corretiva** é contado da conclusão da preventiva (decisão 1.2); com conclusão retroativa a corretiva já nasce vencida. Manter?
4. **Equipamento inativo:** deve sumir de alertas, KPIs e indicadores e bloquear paradas/conclusões? (#5)

## Sugestão de ordem de correção

1. **Segurança e integridade:** #1, #2, #3, #8.
2. **Sessão e confiabilidade da tela:** #4, #10, #11, #12 e a regressão da data vazia.
3. **Regras de negócio** (após as decisões acima): #5, #6, #7, #9, #13.
4. **Baixos**, agrupados por tela.
