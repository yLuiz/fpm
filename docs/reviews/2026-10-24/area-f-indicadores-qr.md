# Revisão funcional — Área F. Indicadores e QR Code

> **Objetivo:** registrar os achados da revisão funcional da área F (indicadores `/metrics/*`, aba Indicadores, QR Code `/e/:id` e etiquetas) na rodada de 2026-10-24.
> **Categoria:** reviews · **Status:** Concluído
> **Atualizado em:** 2026-10-24
> **Relacionados:** [Padrão de revisão funcional](../../process/padrao-revisao-funcional.md) · [Plano de funcionalidades](../../plans/plano-funcionalidades.md) · [Decisões de funcionalidades](../../plans/decisoes-funcionalidades.md)

- **Testes:** 2026-10-25 03:02–03:12 UTC (24/10, 00:02–00:12 em America/Sao_Paulo). O backend roda com `TZ=America/Sao_Paulo`: os limites de mês da série mensal saíram em 03:00Z, como esperado.
- **Ambiente:** API `http://localhost:3001`, frontend `http://localhost:5173`, mais o acesso pelo IP da rede `http://192.168.101.3:5173`. Nenhum container foi reiniciado e nenhum código foi alterado. Fiz 1 login por API para cada usuário (admin e user) e 1 login pela tela (user, no teste de retorno do QR). O resto usou tokens reaproveitados, com refresh quando preciso, injetados no `localStorage`.
- **Navegador:** Playwright/Chromium headless, em 1440×900 e 390×844 (`isMobile`). A decodificação do QR usou `jsqr@1.4.0` + `pngjs@7.0.0`, instalados numa pasta isolada do scratchpad.
- **Evidências:** `C:\Users\LUIZ\AppData\Local\Temp\claude\e--Estudos-ProjetosPessoais-Descomplica\57045645-c400-4d0a-90e7-53fb4f2bb27a\scratchpad\e2e\area-f\`
  - API: `recalc.mjs` (recálculo independente), `edge.mjs` (casos de borda), `mine.mjs` (parada aberta/encerrada), `dump*.mjs` + `raw.json` (dados brutos)
  - Tela: `ui1.mjs` (Indicadores), `ui2.mjs` (scan), `ui3.mjs` (etiquetas + decodificação do QR + impressão), `ui4.mjs` (estilos de impressão/PDF), `ui5.mjs` (login com retorno, inativo, excluído, falha de rede); screenshots `*.png`
- **Dados de teste:** criei `[REVIEW-F] Motor QR` (com uma parada de 2 h retroativa, já encerrada, e a corretiva aberta junto) e `[REVIEW-F] Bomba sem pendencia`. Os dois foram excluídos (soft delete) ao final. A parada ficou no banco, mas sai dos indicadores porque o equipamento foi excluído (ver F-03).

---

## Recálculo dos indicadores (fórmulas × plano)

Recalculei cada indicador direto dos dados brutos da API (`/downtime`, `/maintenance/by-equipment/:id` dos 10 equipamentos do seed e `/equipment`), com código próprio que segue as fórmulas do plano e das decisões 3.1 a 3.7. O "fim do dia" foi calculado em -03:00. Comparei o resultado com `/metrics/summary` lido no mesmo instante, usando o `equipmentCount` devolvido pela API.

| Período | Cumprimento | Atraso médio | Paradas (atraso/em dia) | Min. parados | MTTR | MTBF | Disponib. | Resultado |
|---|---|---|---|---|---|---|---|---|
| Ago/26 SP (`08-01T03:00Z`..`09-01T02:59:59.999Z`), 25 eq. | 10/12 = 0,8333 | 0,9 d | 3 (2/1) | 1172 | 391 min | 6193,5 h | 0,9990 | **igual** |
| Borda (`08-02T18:00Z`..`08-10T15:00Z`) | 4/5 = 0,8 | 0 | 2 (1/1) | 655 | 379 min | 2357 h | 0,9977 | **igual** |
| Mai–Jul/26 SP | 30/37 = 0,8108 | 1,7 d | 5 (5/0) | 1100 | 220 min | 11036,3 h | 0,9997 | **igual** |
| Jun/26 (sem paradas) | 13/13 = 1 | 0 | 0 | 0 | `null` | `null` | 1 | **igual** |
| Últimas 2h30 com a minha parada **aberta** | — | — | 1 (+1 de outro revisor) | 268 | `null` | 80,5 h | 0,9475 | **igual** |
| A mesma, depois de **encerrada** | — | — | 1 | 268 | 120 min | 80,5 h | 0,9475 | **igual** |

- **As fórmulas batem com o plano e com as decisões.** No caso "Borda", a parada da Esteira B começa antes do período: conta só 232,8 min de sobreposição e fica fora da contagem e do MTTR. A da Bomba de Refrigeração termina depois do período: conta 120 min de sobreposição, mas o MTTR usa a duração inteira, como manda a decisão 3.5. Uma parada aberta conta até "agora" e não entra no MTTR. A série `/metrics/monthly` de ago/26 bate com o cálculo por mês de calendário em SP (0,8333; 3 paradas, 2 com preventiva vencida; 1172 min).
- **Sem paradas:** MTBF e MTTR vêm `null` (a tela mostra "—") e não há divisão por zero. Período sem horas disponíveis (futuro ou `from = to`): disponibilidade `null`.
- **Na tela:** os KPIs batem com a resposta de `/metrics/summary`/`monthly` capturada pelo navegador: 73% · 11 de 15; 0,4 d; 2439 h (`2439.2` arredondado); 14h 21min (`861` min); 99,6% (`0.9964`); "3d 16h parados" (`5289` min). A frase "45% das paradas" vem de 9/20 na série de 6 meses. O tooltip de ago/26 mostra "2 | 1". Não houve erro de console em nenhuma das duas larguras.
- **O problema está no denominador.** A coluna "MTBF" acima usa 25 equipamentos, a quantidade de ativos **hoje**. Com os 10 equipamentos que existiam em agosto, o MTBF de agosto seria **2473,5 h**, e não 6193,5 h, e a disponibilidade seria 0,9974 em vez de 0,9990. Ver F-01.

---

## Achados

### [MÉDIO] F-01 · MTBF e disponibilidade de períodos passados usam a quantidade de equipamentos ativos de hoje
- **Área / camada:** F. Indicadores / Backend
- **Onde:** `backend/src/metrics/metrics.service.ts:43` (`equipment.count({ deletedAt: null, status: 'ACTIVE' })`), usado em `backend/src/metrics/metrics.calc.ts:85` (`availableMinutes = periodMinutes * equipmentCount`)
- **Como reproduzir:** `GET /metrics/summary?from=2026-08-01T00:00:00-03:00&to=2026-08-31T23:59:59.999-03:00` várias vezes enquanto equipamentos são cadastrados. Os dados de agosto não mudaram, mas a resposta mudou.
- **Esperado:** um indicador de um período fechado não muda depois. O denominador deveria considerar só os equipamentos que existiam e estavam ativos no período: nada antes do `createdAt`, nada depois da exclusão.
- **Obtido:** agosto/26, em minutos: `equipmentCount` 25 → MTBF **6193,5 h**; 32 → **7929,5 h**; 34 → 7929,5 h ou mais. Com os 10 equipamentos que existiam, o valor seria **2473,5 h**. A disponibilidade também sobe com cada equipamento novo. Num período enorme (`from=0001-01-01&to=9999-12-31`) a conta multiplica 2000 anos por 32 equipamentos: **MTBF 51.659.378,6 h** e disponibilidade 1. A mesma distorção aparece no cálculo de "últimos 30 dias" para quem acabou de cadastrar equipamentos.
- **Causa provável:** a contagem é feita uma vez, com o estado atual, e multiplicada pela duração inteira do período, sem levar em conta o `createdAt` (nem o `deletedAt`) de cada equipamento.
- **Sugestão de correção:** somar, por equipamento, a interseção entre o período e `[createdAt, deletedAt ?? now]`, em vez de usar `periodo × count`. Também convém limitar o `from` ao `createdAt` mais antigo.

### [MÉDIO] F-02 · Paradas de equipamento inativo entram no numerador, mas as horas dele saem do denominador
- **Área / camada:** F. Indicadores / Backend
- **Onde:** `backend/src/metrics/metrics.service.ts:19` e `:34-39`: as paradas filtram só `equipment.deletedAt: null`, enquanto a contagem (`:43`) filtra `status: 'ACTIVE'`
- **Como reproduzir:** criar um equipamento, registrar e encerrar uma parada e ler `/metrics/summary` no período da parada. Depois, `PATCH /equipment/:id/toggle-status` (→ INACTIVE) e ler de novo.
- **Esperado:** critério igual nos dois lados. Ou a parada do equipamento inativo sai da conta, ou o equipamento continua no denominador durante o período em que estava ativo.
- **Obtido:** antes: `equipmentCount 29`, `count 10`, `totalMinutes 315`, `availability 0.9139`, `mtbf 5.6`. Depois de desativar: `equipmentCount 28`, `count 10`, `totalMinutes 315`, **`availability 0.9108`**, **`mtbf 5.4`**. Desativar um equipamento **piora** a disponibilidade do passado. Há também o caso `[REVIEW-B] Inativo com pendencia` (de outro revisor): 3 dias de parada contados com o equipamento fora do denominador. No limite, a disponibilidade pode ficar negativa.
- **Causa provável:** os dois `where` usam filtros diferentes (só `deletedAt` num, `deletedAt` + `status` no outro).
- **Sugestão de correção:** resolver junto com F-01 (equipamento conta pelo tempo em que existiu). No mínimo, aplicar o mesmo filtro às paradas, às preventivas e à contagem.

### [BAIXO] F-03 · Excluir um equipamento apaga, sem aviso, as paradas e preventivas dele dos indicadores históricos
- **Área / camada:** F. Indicadores / Backend
- **Onde:** `backend/src/metrics/metrics.service.ts:19` (`equipmentFilter = { deletedAt: null }`, aplicado às preventivas e às paradas)
- **Como reproduzir:** no mesmo período de F-02, `DELETE /equipment/:id` e ler `/metrics/summary` de novo.
- **Esperado:** o plano não define o comportamento. Para um indicador histórico, o esperado é que o passado não mude.
- **Obtido:** `count 10 → 9`, `totalMinutes 315 → 196`, `mttr 26 → 10`. A parada de 2 h que já tinha acontecido desapareceu do histórico.
- **Causa provável:** o filtro de soft delete do cadastro foi reaproveitado nos fatos históricos.
- **Sugestão de correção:** decidir a regra e registrá-la em `decisoes-funcionalidades.md`. Se o passado deve ficar estável, manter as paradas e preventivas e tirar só as horas posteriores ao `deletedAt`.

### [BAIXO] F-04 · `from`/`to` aceitam datas de calendário inválidas e datas sem hora viram meia-noite UTC
- **Área / camada:** F. Indicadores / Backend
- **Onde:** `backend/src/metrics/metrics.controller.ts:11` e `:16` (`@IsDateString()`), `backend/src/metrics/metrics.service.ts:52-54` (`new Date(from)`)
- **Como reproduzir:** `GET /metrics/summary?from=2026-02-31&to=2026-03-05` e `GET /metrics/summary?from=2026-08-01&to=2026-08-31`
- **Esperado:** `400` para 31/02. Para datas sem hora, o dia inteiro no fuso da fábrica, de 00:00 de `from` a 23:59:59 de `to`.
- **Obtido:** 31/02 devolve `200` com `from: 2026-03-03T00:00:00Z` (rolou para março sem avisar). Já `2026-08-01..2026-08-31` vira `2026-08-01T00:00Z..2026-08-31T00:00Z`, ou seja, 31/07 21:00 → 30/08 21:00 em SP: as últimas 3 h de julho entram e o dia 31/08 inteiro fica de fora. Datas sem sentido (`2026-13-01`, `abc`) e `from > to` dão `400` corretamente.
- **Causa provável:** `IsDateString` valida só o formato ISO, e o JS interpreta data sem hora como UTC.
- **Sugestão de correção:** `@IsDateString({ strict: true })` e, quando vier só a data, montar o início/fim do dia em `America/Sao_Paulo`. Hoje a tela não envia `from`/`to`, então o impacto fica em quem usa a API direto.

### [BAIXO] F-05 · Tela de scan mostra "Equipamento não encontrado" para qualquer erro (rede, 500)
- **Área / camada:** F. QR Code / Frontend
- **Onde:** `frontend/src/pages/EquipmentScan.tsx:19` (`.catch(() => setNotFound(true))`)
- **Como reproduzir:** abrir `/e/:id` de um equipamento existente com a requisição `GET /equipment/:id` abortada (rede) ou respondendo `500` (simulado com `page.route`)
- **Esperado:** "Não encontrado" só para `404`. Nos outros erros, mensagem de falha de conexão com opção de tentar de novo.
- **Obtido:** nos dois casos aparece "Equipamento não encontrado · A etiqueta pode estar desatualizada" (`scan-rede-falha.png`). No celular com Wi-Fi instável, o técnico vai achar que a etiqueta está errada.
- **Causa provável:** o `catch` não olha o status do erro.
- **Sugestão de correção:** checar `isAxiosError(e) && e.response?.status === 404`. Nos outros casos, mostrar "Não foi possível carregar" com um botão "Tentar novamente".

### [BAIXO] F-06 · QR de equipamento **inativo** leva direto ao registro da corretiva/preventiva, sem aviso
- **Área / camada:** F. QR Code / Frontend
- **Onde:** `frontend/src/lib/qr.ts:28-43` (`scanTarget` não olha `equipment.status`). Comparar com `frontend/src/pages/EquipmentLabels.tsx:46` (`getAll('ACTIVE')`: a tela de etiquetas já ignora inativos)
- **Como reproduzir:** desativar `[REVIEW-F] Motor QR`, que tem corretiva aberta, e abrir `/e/<id>`
- **Esperado:** o plano/decisão 4.2 não trata o caso. Coerente com a tela de etiquetas: cair no detalhe, com o status "Inativo" visível, ou avisar antes de registrar.
- **Obtido:** redireciona para `/maintenance/<corretiva>/register` ("Registrar corretiva · [REVIEW-F] Motor QR"), sem indicar que o equipamento está inativo (`scan-inativo-390.png`). Uma etiqueta antiga, ainda colada, continua levando ao registro. `labels?ids=<inativo>` mostra 0 etiquetas e "0 selecionada(s)", também sem explicação.
- **Causa provável:** regra de destino sem o caso de inativo.
- **Sugestão de correção:** em `scanTarget`, se `status === 'INACTIVE'`, devolver o detalhe do equipamento. Registrar a regra na decisão 4.2.

### [BAIXO] F-07 · Impressão das etiquetas com "gráficos de plano de fundo" ligado sai com fundo escuro entre as etiquetas
- **Área / camada:** F. QR Code / Frontend
- **Onde:** `frontend/src/components/Layout.tsx:9` (`<div className="h-full bg-background">`, sem `print:bg-white`). O `@media print` de `frontend/src/index.css:253-260` só força o branco em `html, body, #root`
- **Como reproduzir:** `/equipment/labels` com o tema escuro (padrão), `page.emulateMedia({ media: 'print' })` + screenshot, ou `page.pdf({ printBackground: true })`
- **Esperado:** decisão 4.4: "página com estilo de impressão (sem menu, fundo branco, 2 colunas)".
- **Obtido:** o menu some e ficam 2 colunas, como esperado, mas o wrapper do layout continua com `rgb(16,16,24)`. As faixas entre as etiquetas saem pretas (`labels-localhost-print.png`). Na impressão padrão do Chrome os fundos não saem, então o problema só aparece quando o usuário marca "Gráficos de plano de fundo". Nesse caso, porém, gasta tinta e atrapalha o recorte.
- **Causa provável:** o branco de impressão foi aplicado só até `#root`. O `div` do layout logo abaixo ainda pinta o fundo.
- **Sugestão de correção:** `print:bg-white` no wrapper do `Layout`, ou `* { background: transparent }` no bloco `@media print`, mantendo o branco da etiqueta.

---

## Não confirmado / observações

- **MTBF bem maior que o período:** pela fórmula agregada da decisão 3.4, o MTBF de 30 dias aparece como "2439 h" (≈ 101 dias). Bate com o plano, mas pode confundir na apresentação. A dica do KPI ("Tempo médio entre falhas") não diz que é a soma da frota. Isto é questão de texto, não um defeito.
- **`frontend/.env` com `VITE_API_URL=http://localhost:3001`:** está no `.dockerignore`, então o container não usa esse valor e o acesso pelo IP funcionou (abaixo). Num `npm run dev` local fora do Docker, porém, ele anularia a decisão 4.6 e o celular não acharia a API. Não testei fora do container.
- **Corretiva aberta a partir de parada:** o registro aberto pelo QR mostra o quadro "Achados da preventiva" com o texto da parada. Isso é da área C/E e não investiguei.
- **Impressão real:** não consegui renderizar o PDF gerado (sem poppler na máquina). As quebras de página entre etiquetas (`break-inside-avoid` dentro de grid) não foram conferidas em papel/PDF, só por screenshot em mídia print.

---

## O que foi testado e passou

| Item | Resultado |
|---|---|
| `GET /metrics/summary` e `/metrics/monthly` sem token | `401` |
| USER acessa os dois endpoints | `200` (não é restrito a ADMIN, conforme o plano) |
| Padrão de período (`summary` sem parâmetros) | `from = agora − 30 dias`, `to = agora` |
| Fórmulas de cumprimento, atraso médio, MTTR, MTBF, disponibilidade e paradas em dia × em atraso | Recalculadas em 4 períodos passados + 2 com parada aberta/encerrada: **iguais** à API (tabela acima) |
| Parada que começa antes do período e termina dentro / começa dentro e termina depois | Conta só a sobreposição nos minutos parados; fora da contagem/MTTR quando começou antes (decisões 3.5/3.7) |
| Parada aberta | Conta até "agora" nos minutos; fica fora do MTTR; após encerrar, o MTTR passa a 120 min |
| Período sem paradas | MTBF/MTTR `null`, disponibilidade 1, sem erro |
| `from > to`, `to` no passado sem `from`, `from` no futuro sem `to` | `400` "O início do período deve ser anterior ao fim" |
| `from=abc`, `from=2026-13-01` | `400` com mensagem de validação |
| Período futuro ou de duração zero | `200`, disponibilidade `null` (sem divisão por zero) |
| Período enorme (1900→hoje, 0001→9999) | `200` em ~10 ms (valores distorcidos: ver F-01) |
| `months` = 0, 13, `abc`, `1.5` | `400`; `months=12` → 12 meses, do mais antigo ao atual |
| Série mensal em meses de calendário de SP | ago/26 confere com o recálculo pelo mês de SP |
| Aba Indicadores (1440 e 390) | Carrega sem erro de console; 5 KPIs e 2 gráficos; números iguais à API; sem rolagem horizontal |
| Cores por faixa | 73% em vinho (< 75%), 0,4 d em amarelo, 99,6% em verde (≥ 98%) |
| Legenda clicável do gráfico de paradas | Esconde/mostra a série (`aria-pressed` acompanha); totais por série na legenda |
| Tooltip e linha de meta (90%) | Tooltip mostra mês + 2 séries; linha "Meta" tracejada |
| `/?tab=indicadores` | Abre direto na aba (decisão 3.10) |
| `/e/:id` com corretiva aberta | → `/maintenance/<corretiva>/register` |
| `/e/:id` com preventiva vencida (Motor Auxiliar L2) | → registro da preventiva |
| `/e/:id` com preventiva a vencer em 2 dias (Esteira B) | → registro da preventiva (janela de 3 dias) |
| `/e/:id` sem pendência próxima | → `/equipment/:id` |
| `/e/<uuid inexistente>`, `/e/abc`, `/e/<excluído>` | "Equipamento não encontrado" + botão "Ver equipamentos" (API `404`, não `500`) |
| **QR sem sessão** (pela tela de login, celular 390) | `/e/<id>` → `/login` → login de `user@fpm.com` → volta e redireciona para o registro da corretiva |
| Botão "Etiquetas QR" na lista e "Etiqueta QR" no detalhe | Lista → todas as etiquetas dos ativos; detalhe → `labels?ids=<id>` com 1 etiqueta |
| Quantidade de etiquetas | 1 por equipamento **ativo** (32 no momento do teste; inativos e excluídos ficam fora) |
| Conteúdo do QR | 3 QR decodificados da imagem com `jsQR`: o texto é exatamente `<origem>/e/<id>`, igual ao `data-url` |
| Host do QR | Em `localhost:5173` o QR usa `http://localhost:5173` e a tela mostra o aviso de que não abre no celular. Em `http://192.168.101.3:5173` o QR usa o IP da rede, sem aviso, e a API responde por esse host (CORS aberto, decisão 0.8; API por `hostname:3001`, decisão 4.6) |
| "Nenhum" / "Todos" | 0 etiquetas e "Imprimir" desabilitado / todas de volta |
| Impressão (`emulateMedia print`) | Sem menu lateral nem cabeçalho; etiquetas brancas em 2 colunas; `body` branco (ressalva: F-07) |
| Telas de destino do scan em 390px | Sem rolagem horizontal (`scrollWidth = 390`) |
