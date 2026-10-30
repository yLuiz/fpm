# Plano de Funcionalidades — FPM (fechar o ciclo da manutenção)

> **Categoria:** plans · **Status:** Concluído
> **Relacionados:** [Design system](../design/design-system-junglerms.md) · [Requisitos do MVP](../specs/mvp-requisitos-originais.md)

> **Objetivo:** fazer o FPM passar de "agendador que não deixa esquecer" para "sistema que detecta o
> problema antes da quebra e prova que as paradas caíram". Três frentes:
>
> 1. **Checklist com resultado → ordem corretiva**: o achado da inspeção vira trabalho rastreado.
> 2. **Paradas + indicadores**: medir o que o pitch promete (MTBF, MTTR, disponibilidade, cumprimento).
> 3. **QR Code no equipamento**: o técnico escaneia e já cai no registro.
>
> Este arquivo é a fonte da verdade da execução. Marcar o progresso em [Status](#status-de-execução).
> O visual segue `docs/design/design-system-junglerms.md` (ver `frontend/REDESIGN-PLAN.md`).

---

## Diagnóstico do código atual

| Ponto | Onde | Impacto |
|---|---|---|
| Checklist é `string[]` só com os itens marcados; aceita concluir com 1 de 3 | `CompleteMaintenanceDto`, `MaintenanceRegister.tsx` | Preventiva incompleta parece completa; "Não OK" não tem onde ser registrado |
| Não existe corretiva nem parada | `schema.prisma` | Impossível medir MTBF/MTTR ou provar a redução de paradas |
| `complete()` faz update + create sem transação | `maintenance.service.ts` | Falha no meio deixa equipamento sem próxima preventiva |
| `complete()` lança `Error` genérico se já concluída | idem | Responde 500 em vez de 409 |
| Seed roda em **todo** start do container e apaga tudo (`deleteMany`) | `Dockerfile` CMD + `seed.ts` | Paradas e registros novos somem a cada restart |
| Seed só cria preventivas futuras, sem histórico | `seed.ts` | Indicadores ficariam vazios na demonstração |
| Login não volta para a página de origem | `App.tsx` `PrivateRoute` | QR Code escaneado sem sessão perde o destino |
| Sem testes no backend (`backend/test` não existe) | — | Regras novas de cálculo sem rede de proteção |

---

## Decisões de modelagem

1. **Corretiva é uma `Maintenance` com `kind = CORRECTIVE`**, e não uma entidade nova. Assim reaproveita
   o registro, o histórico, as listas de vencidas/a vencer e o dashboard. A corretiva **não** gera a próxima
   ao ser concluída; só a preventiva gera.
2. **Prazo da corretiva pela criticidade do equipamento:** HIGH = 1 dia, MEDIUM = 3 dias, LOW = 7 dias.
3. **Uma corretiva por conclusão**, listando todos os itens "Não OK" (e não uma por item).
4. **Parada (`Downtime`) é entidade própria**, com início e fim. Parada aberta (`endedAt = null`) =
   equipamento "Parado". Ao abrir uma parada, cria-se opcionalmente uma corretiva vinculada.
5. **Snapshot `preventiveOverdue`:** ao registrar a parada, o sistema grava se o equipamento tinha preventiva
   vencida naquele momento. É a base da métrica "paradas com preventiva em dia × em atraso".
6. **Seed idempotente:** só popula se o banco estiver vazio. Para resetar, há um comando explícito
   (`npm run prisma:seed -- --reset`). O seed passa a gerar **6 meses de histórico**.
7. **Checklist antigo (`string[]`) continua legível:** o front converte o formato legado para "OK" na exibição.

### Fórmulas dos indicadores (período `from`..`to`, padrão = últimos 30 dias)

| Indicador | Cálculo |
|---|---|
| Cumprimento do plano | preventivas com `concludedAt ≤ fim do dia de dueDate` ÷ preventivas com `dueDate` no período (concluídas ou vencidas) |
| Atraso médio | média de `concludedAt − dueDate` (em dias, mínimo 0) das preventivas concluídas no período |
| MTTR | soma da duração das paradas encerradas ÷ nº de paradas encerradas |
| MTBF | (horas do período × nº de equipamentos ativos − horas paradas) ÷ nº de paradas |
| Disponibilidade | 1 − horas paradas ÷ (horas do período × nº de equipamentos ativos) |
| Paradas × preventiva | contagem de paradas por `preventiveOverdue` (true/false) |

Paradas que cruzam a borda do período contam só a parte dentro dele. As funções de cálculo ficam puras
(`metrics.calc.ts`) para serem testáveis sem banco.

---

## Fase 0 — Base (pré-requisito)

**Backend**
- `seed.ts`: sair cedo se já houver usuários; flag `--reset` para o comportamento atual. Gerar histórico de
  6 meses por equipamento: preventivas concluídas (≈80% no prazo, ≈20% com 2–10 dias de atraso), alguns
  itens "Não OK" com corretivas concluídas, e 8–12 paradas (maioria em equipamentos com preventiva atrasada,
  para a demonstração refletir a tese).
- `complete()` dentro de `prisma.$transaction`; trocar `Error` por `ConflictException`.
- Registrar a conclusão no `AuditService` (hoje só equipamento e auth registram).

**Frontend**
- `PrivateRoute` guarda `location` em `state.from`; `Login` volta para lá após autenticar.

## Fase 1 — Checklist com resultado → corretiva

**Backend**
- Prisma: `enum MaintenanceKind { PREVENTIVE CORRECTIVE }`; em `Maintenance`: `kind` (default PREVENTIVE),
  `originId String?` (self-relation para a preventiva de origem), `description String?`. Índice em `[kind, status]`.
  Migration `add_corrective_maintenance`.
- `CompleteMaintenanceDto.checklist` → `ChecklistResultDto[]` com `{ item: string; result: 'OK'|'NOK'|'NA'; note?: string }`.
  Validação no service: todo item do checklist do tipo respondido exatamente uma vez; `note` obrigatória quando NOK.
  Para corretiva, o checklist é opcional e `observations` (solução aplicada) é obrigatória.
- `complete()`:
  - preventiva → grava resultado, agenda a próxima e, se houver NOK, cria uma corretiva (`originId`, prazo pela
    criticidade, `description` com os itens NOK e as notas);
  - corretiva → só conclui.
  - Resposta inclui `{ maintenance, next, corrective }` para o front avisar.
- `findUpcoming`/`findOverdue`/stats: incluir corretivas (com `kind` no payload). Query `kind` opcional.
- `GET /maintenance/:id` inclui `origin` e `correctives`.

**Frontend**
- `types`: `MaintenanceKind`, `ChecklistResult`, labels.
- Novo componente `ui/segmented.tsx` (Select Button do design system: segmentos colados, selecionado em `#66A197`).
- `MaintenanceRegister`:
  - preventiva → cada item com OK / Não OK / N.A.; ao marcar Não OK, abre campo de nota; resumo
    "X OK · Y Não OK"; aviso "Será aberta uma ordem corretiva" se houver NOK;
  - corretiva → mostra os achados de origem e pede a solução aplicada.
  - Após salvar, toast indicando a corretiva aberta, com link.
- Badge de tipo (Preventiva / **Corretiva**) nas tabelas do Dashboard e no histórico do equipamento; histórico
  mostra o resultado do checklist (ícones OK/NOK) e o vínculo origem ↔ corretiva.

## Fase 2 — Paradas

**Backend**
- Prisma: `enum DowntimeCause { MECHANICAL ELECTRICAL OPERATIONAL OTHER }`; model `Downtime { id, equipmentId,
  startedAt, endedAt?, cause, description, preventiveOverdue Boolean, correctiveId String? @unique,
  createdById String?, createdAt, updatedAt, deletedAt? }`. Migration `add_downtime`.
- Módulo `downtime` (controller/service/DTOs + Swagger + audit):
  - `POST /downtime` (opção `openCorrective: true`; impede segunda parada aberta no mesmo equipamento);
  - `PATCH /downtime/:id/close` (`endedAt` ≥ `startedAt`);
  - `GET /downtime?equipmentId&open&from&to`.
- `Equipment` no payload ganha `isDown` (há parada aberta).

**Frontend**
- Nova página **Paradas** (`/downtime`) no menu lateral: lista com filtro (abertas / período), duração em
  tempo real nas abertas (indicador "pulse" do design system), botão "Encerrar".
- Dialog "Registrar parada" (equipamento, início, causa, descrição, checkbox "Abrir corretiva"), acessível pela
  página Paradas e pelo detalhe do equipamento.
- Badge **Parado** (cor de falha) na lista e no detalhe do equipamento.

## Fase 3 — Indicadores

**Backend**
- `GET /metrics/summary?from&to` → cumprimento, atraso médio, MTBF, MTTR, disponibilidade, paradas
  em dia × em atraso.
- `GET /metrics/monthly?months=6` → série mensal de cumprimento e de paradas (separadas por `preventiveOverdue`).
- Cálculos em `metrics.calc.ts` (funções puras) com **testes unitários Jest** (`metrics.calc.spec.ts`):
  período vazio, parada cruzando a borda, divisão por zero, preventiva concluída no último minuto do dia.

**Frontend**
- Dashboard ganha a **barra de abas** do design system: **Operação** (conteúdo atual) | **Indicadores**.
- Aba Indicadores:
  - linha de KPIs: Cumprimento %, MTBF (h), MTTR (h), Disponibilidade % (cor de status por faixa);
  - gráfico de barras mensal de cumprimento com linha de referência na meta (90%, cor `#C0C0C1`);
  - gráfico mensal de paradas empilhado: "com preventiva em atraso" (vinho) × "em dia" (verde), com legenda
    clicável. **Este é o gráfico do pitch.**
- Cores novas registradas em `src/lib/chart-colors.ts`.

## Fase 4 — QR Code

**Frontend** (sem mudança no backend)
- Dependência `qrcode.react` (versão fixa).
- Rota curta `/e/:id`: carrega o equipamento e redireciona para a pendência mais urgente (corretiva aberta →
  preventiva agendada) ou, se não houver, para o detalhe.
- Página `/equipment/labels`: grade de etiquetas imprimíveis (QR + nome + local + tipo) com CSS `@media print`;
  seleção de equipamentos. Botão "Etiqueta" no detalhe do equipamento.
- URL base do QR por `VITE_PUBLIC_URL` (padrão `window.location.origin`). **No celular, `localhost` não
  funciona**: para a demonstração, usar o IP da máquina na rede (o Vite já sobe com `host: true`).
- Revisar a tela de registro no celular (largura ~375px): menu lateral não pode espremer o checklist.

## Fase 5 — Fechamento

- Rebuild dos containers (`docker compose up -d --build backend frontend`). A migration roda no start do
  backend; com o seed idempotente, rodar uma vez `--reset` para gerar o histórico novo.
- Smoke test manual do fluxo completo: preventiva com NOK → corretiva → parada → encerrar → indicadores →
  QR no celular.
- Atualizar `README.md` (endpoints novos) e `docs/pitch/analise-e-pitch.md` (itens 6.x atendidos).
- Liberar os **prints do pitch** (slide 5) com as telas novas.

---

## Fora do escopo (próximas rodadas)

Medições numéricas no checklist, foto como evidência, frequência por equipamento, calendário fixo × flutuante,
reprogramar com justificativa, fila priorizada do técnico, painel de TV, relatório PDF para NRs, notificações.

## Riscos

- **Migration em banco com dados reais:** o default `PREVENTIVE` cobre os registros existentes; o checklist legado é tratado no front.
- **Seed idempotente muda o comportamento atual** (hoje todo restart reseta o banco). É intencional, e o README deve dizer como resetar.
- **Fuso horário no cumprimento:** o "fim do dia" de `dueDate` usa o fuso do servidor. Para o MVP vale fixar `TZ=America/Sao_Paulo` no container do backend.

## Status de Execução

- [x] **Fase 0**: seed idempotente, transação no `complete` (409 + auditoria), retorno pós-login, infra de testes (Jest unit/integração/e2e no backend; Vitest + Playwright no frontend). O histórico do seed passou para a Fase 3, quando todos os modelos já existem.
- [x] **Fase 1**: checklist OK/NOK/NA + corretiva automática (backend, telas de registro, detalhe e dashboard; testes nas três camadas)
- [x] **Fase 2**: paradas (registrar, encerrar, listar com filtros; status "Parado" na lista, detalhe e dashboard; testes nas três camadas)
- [x] **Fase 3**: indicadores (`/metrics/summary`, `/metrics/monthly`), aba Indicadores no dashboard, histórico de 6 meses no seed; testes nas três camadas
- [x] **Fase 4**: QR Code (rota `/e/:id`, página de etiquetas imprimíveis, botões na lista e no detalhe, layout no celular); testes nas três camadas, e2e em viewport de celular
- [x] **Fase 5**: bateria final (backend 42 unit + 13 integração + 12 e2e; frontend 44 Vitest + 7 Playwright, incluindo o fluxo completo), rebuild dos containers com migrations, histórico gerado no banco de desenvolvimento, README atualizado. **Prints do pitch ficam liberados.**
