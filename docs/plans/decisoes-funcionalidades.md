# Decisões da Implementação de Funcionalidades

> **Objetivo:** registrar cada decisão técnica e premissa de domínio assumida durante a execução do plano de funcionalidades, com o motivo.
> **Categoria:** plans · **Status:** Ativo
> **Atualizado em:** 2026-10-24
> **Relacionados:** [Plano de funcionalidades](plano-funcionalidades.md)

Legenda: **T** = decisão técnica (tomada sem consulta) · **D** = premissa de domínio (precisa de validação, ver [Dúvidas pendentes](#dúvidas-de-domínio-pendentes)).

---

## Fase 0 — Base e infraestrutura de testes

| # | Tipo | Decisão | Motivo |
|---|---|---|---|
| 0.1 | T | Seed só popula banco vazio; `--reset` recria tudo | O container roda o seed a cada start e apagava dados reais (paradas, registros). |
| 0.2 | T | Histórico de 6 meses no seed movido para a Fase 3 | Precisa dos modelos de corretiva e parada, que só existem após as Fases 1 e 2. |
| 0.3 | T | `complete()` em transação interativa com `updateMany where status = SCHEDULED` | Garante atomicidade e impede que dois envios simultâneos gerem duas próximas manutenções. |
| 0.4 | T | Manutenção já concluída responde **409** (antes 500) | Erro de estado, não de servidor; o front pode tratar. |
| 0.5 | T | Conclusão de manutenção registrada no audit log com o usuário | Rastreabilidade (argumento de auditoria do pitch); antes só equipamento e login eram auditados. |
| 0.6 | T | Configuração HTTP extraída para `src/app.setup.ts` | Os testes e2e sobem a aplicação com exatamente a mesma configuração do `main.ts`. |
| 0.7 | T | Rate limit desligado com `NODE_ENV=test` | Os testes fazem dezenas de requisições por segundo; o limite de produção continua igual. |
| 0.8 | T | CORS aceita qualquer origem quando `CORS_ORIGINS` não é definido | O QR Code é aberto no celular pelo IP da rede; lista fixa de `localhost` bloquearia. Em produção, definir `CORS_ORIGINS`. |
| 0.9 | T | Três camadas de teste no backend: unit (`src/**/*.spec.ts`, Prisma mockado), integração (`test/integration`, banco real `fpm_test`), e2e (`test/e2e`, HTTP com supertest) | Separa regra pura, persistência e contrato HTTP; banco isolado não toca nos dados de demonstração. |
| 0.10 | T | Frontend: Vitest + Testing Library (unit e integração com API mockada) e Playwright (e2e) | Vitest reaproveita a config do Vite; Playwright cobre o navegador real. |
| 0.11 | T | Playwright sobe stack própria (backend 3101 com banco `fpm_e2e` semeado do zero, frontend 5180) | E2e reprodutível e independente dos containers do docker compose. |
| 0.12 | T | Destino pós-login só aceita caminho interno (`/…`, sem `//`, sem `/login`) | Evita open redirect pelo parâmetro `from`. |
| 0.13 | T | Interceptor de 401 não redireciona na própria chamada de login | Senha errada recarregava a página e o aviso de erro sumia (bug existente). |

## Fase 1 — Checklist com resultado e corretiva

| # | Tipo | Decisão | Motivo |
|---|---|---|---|
| 1.1 | T | Corretiva é uma `Maintenance` com `kind = CORRECTIVE` e `originId` apontando para a preventiva | Reaproveita registro, histórico, listas e KPIs sem uma entidade nova. |
| 1.2 | D | Prazo da corretiva: criticidade alta 1 dia, média 3, baixa 7, contados da conclusão da preventiva | Proporcional ao risco; valores típicos de PME, sem referência do usuário. |
| 1.3 | D | Uma corretiva por preventiva, listando todos os itens "Não OK" com as notas | Um defeito costuma ser atendido numa única intervenção; evita poluir a fila. |
| 1.4 | D | "N.A." vale para qualquer item, não exige nota e não gera corretiva | Itens podem não se aplicar a um modelo específico. |
| 1.5 | D | Corretiva não tem checklist; exige a solução aplicada (campo observações) | O registro relevante da corretiva é o que foi feito. |
| 1.6 | T | Corretivas entram nas listas e contagens de "vencidas" e "a vencer" do dashboard | São trabalho pendente com prazo; aparecem com o selo "Corretiva" para diferenciar. |
| 1.7 | T | `POST /maintenance/:id/complete` passou a devolver `{ maintenance, next, corrective }` | O front precisa saber se abriu corretiva para avisar o técnico. Mudança de contrato (o único consumidor é o próprio front). |
| 1.8 | T | A API rejeita o checklist no formato antigo (lista de textos); o front ainda exibe registros antigos como "OK" | Evita conclusão parcial pela API; dados históricos continuam legíveis. |
| 1.9 | T | Validação do checklist duplicada no front (mensagem imediata) e no backend (fonte da verdade) | UX sem ida ao servidor; regra garantida mesmo via Swagger. |
| 1.10 | T | Seletor OK / Não OK / N.A. usa cores de status (verde, vinho, cinza) em vez do acento verde água do Select Button | O resultado precisa ser lido de relance; é a única variação do design system. |
| 1.11 | T | "Próxima preventiva" no detalhe é a preventiva agendada com o prazo mais próximo | Com corretivas no histórico, "a primeira agendada da lista" podia pegar a errada. |
| 1.12 | T | Botão "Pendentes como OK" preenche só os itens sem resposta | Agiliza a inspeção sem apagar um "Não OK" já marcado. |

## Fase 2 — Paradas

| # | Tipo | Decisão | Motivo |
|---|---|---|---|
| 2.1 | T | Parada (`Downtime`) é entidade própria com início, fim, causa e descrição | Tem ciclo de vida diferente da manutenção (aberta/encerrada) e é a base de MTBF/MTTR. |
| 2.2 | D | "Tinha preventiva vencida" = preventiva com prazo **anterior ao dia** da parada e ainda não concluída naquele instante (gravado como snapshot) | Mesmo critério de "vencida" do dashboard; o snapshot não muda se a preventiva for concluída depois. |
| 2.3 | D | No máximo uma parada em andamento por equipamento (409 na segunda) | Um equipamento parado não "para de novo"; evita duplicidade. |
| 2.4 | D | Causas fixas: Mecânica, Elétrica, Operacional, Outra | Suficiente para o MVP e para agrupar no gráfico; sem cadastro de causas. |
| 2.5 | D | Na tela, "Abrir ordem corretiva" vem marcado por padrão; na API o padrão é não abrir | Quase toda parada exige reparo; a API continua explícita. |
| 2.6 | D | Corretiva aberta pela parada usa o mesmo prazo por criticidade (1/3/7 dias), contado do início da parada | Consistência com a Fase 1. |
| 2.7 | D | Encerrar a parada não conclui a corretiva vinculada (e vice-versa) | O equipamento pode voltar a operar com reparo provisório; são registros independentes. |
| 2.8 | D | Qualquer usuário autenticado registra e encerra parada (não só admin) | Quem vê a parada é o técnico/operador no chão de fábrica. |
| 2.9 | T | Início/fim no futuro recusados, com tolerância de 5 minutos | Relógio do celular pode estar levemente adiantado. |
| 2.10 | T | Equipamento devolve `downtimes` com a parada em andamento (0 ou 1 item) | Lista e detalhe mostram "Parado" sem chamada extra. |
| 2.11 | T | Filtro por período usa sobreposição (`startedAt ≤ to` e `endedAt ≥ from` ou em andamento) | Parada que atravessa o início do período também conta. |
| 2.12 | T | Equipamento já parado não aparece na lista de seleção do "Registrar parada" | Evita o 409 previsível. |
| 2.13 | T | Popovers (select, menu, tooltip) com z-index acima de dialogs e do menu lateral | O select de causa abria atrás do dialog. |
| 2.14 | T | Links do menu recolhido ganharam `aria-label` | Sem texto visível não tinham nome acessível (achado pelo teste e2e). |
| 2.15 | T | Novo componente `Dialog` no padrão do design system (máscara com blur, borda fina, raio 10px) | O projeto só tinha AlertDialog. |

## Fase 3 — Indicadores e histórico de demonstração

| # | Tipo | Decisão | Motivo |
|---|---|---|---|
| 3.1 | D | **Cumprimento do plano** = preventivas com prazo no período concluídas até o fim do dia do prazo ÷ preventivas com prazo no período já "cobráveis" (concluídas ou com o dia do prazo encerrado) | Agendada que ainda não venceu não pode contar como falha. Corretivas não entram. |
| 3.2 | D | **Meta de cumprimento: 90%**; cores: ≥ 90% verde, ≥ 75% amarelo, abaixo vinho | Referência comum de PMP compliance; valor configurável no código (`COMPLIANCE_TARGET`). |
| 3.3 | D | **Atraso médio** = média de dias de atraso (arredondado para cima, 0 se no prazo) das preventivas concluídas no período | Mede o quanto o plano escorrega, não só se escorrega. |
| 3.4 | D | **MTBF** = (equipamentos ativos × horas do período − horas paradas) ÷ nº de paradas iniciadas no período | Fórmula clássica agregada; horas de calendário, sem turno (o sistema não conhece turnos). |
| 3.5 | D | **MTTR** = duração média das paradas encerradas iniciadas no período | Parada em andamento ainda não tem tempo de reparo. |
| 3.6 | D | **Disponibilidade** = 1 − horas paradas ÷ horas disponíveis (24h × equipamentos ativos); faixas 98% / 95% | Sem calendário de produção no MVP; considera operação contínua. |
| 3.7 | T | Parada que cruza a borda do período conta só a parte dentro dele; parada aberta conta até agora | Evita inflar o período com tempo de fora. |
| 3.8 | T | Período padrão dos KPIs: últimos 30 dias; série mensal: 6 meses de calendário (1 a 12 via API) | Visão do mês corrente + tendência curta para o pitch. |
| 3.9 | T | Cálculos em funções puras (`metrics.calc.ts`) com testes unitários; o service só busca dados | Regras de negócio testáveis sem banco. |
| 3.10 | T | Dashboard ganhou abas **Operação** \| **Indicadores** (barra de abas do design system), aba guardada na URL (`?tab=indicadores`) | Não sobrecarrega a tela do dia a dia; link direto para a apresentação. |
| 3.11 | T | Gráfico do pitch: paradas por mês empilhadas em "com preventiva vencida" (vinho) × "em dia" (verde), com a frase "X% das paradas aconteceram com a preventiva vencida" | É a evidência visual da tese do produto. |
| 3.12 | T | Seed gera 6 meses de histórico com PRNG fixo (semente 42): ~80% das preventivas no prazo, ~12% com item "Não OK" (corretiva concluída no dia seguinte), 60% dos atrasos geram parada e 4% das preventivas em dia também | Indicadores e gráficos com dados plausíveis e sempre iguais na demonstração. |
| 3.13 | T | Cenário fixo na demonstração: Motor Auxiliar Linha 2 e Painel Elétrico Principal com preventiva vencida; Esteira Linha B a vencer em 2 dias | O dashboard sempre mostra alertas reais ao abrir. |
| 3.14 | T | Testes unitários do backend rodam com fuso fixo `America/Sao_Paulo` | "Fim do dia" usa horário local; o resultado não pode depender da máquina. |

## Fase 4 — QR Code

| # | Tipo | Decisão | Motivo |
|---|---|---|---|
| 4.1 | T | QR aponta para a rota curta `/e/:id` (não para uma tela específica) | A etiqueta impressa continua válida mesmo que as telas mudem; o destino é decidido na leitura. |
| 4.2 | D | Destino ao escanear: corretiva aberta → preventiva vencida ou a vencer em até 3 dias → detalhe do equipamento | Leva o técnico ao que precisa ser feito agora; preventiva distante não deve ser registrada adiantada por engano. A janela de 3 dias é a mesma do "a vencer" do dashboard. |
| 4.3 | T | Geração do QR no próprio front (`qrcode.react`, SVG), sem endpoint no backend | Etiqueta é só uma URL; SVG imprime nítido em qualquer tamanho. |
| 4.4 | T | Etiqueta sempre preta no branco (inclusive no tema escuro) e página com estilo de impressão (sem menu, fundo branco, 2 colunas) | Leitores de QR precisam de contraste; economiza tinta. |
| 4.5 | T | URL base do QR: `VITE_PUBLIC_URL` ou a origem da página; a tela avisa quando a base é `localhost` | `localhost` no celular aponta para o próprio aparelho; o aviso evita imprimir etiquetas inúteis. |
| 4.6 | T | Front sem `VITE_API_URL` usa o mesmo host da página na porta 3001 (removido do docker compose) | Aberto pelo IP da rede no celular, o front encontra a API sem configuração. |
| 4.7 | T | Menu lateral mais estreito em telas pequenas (64px) e padding menor no celular | O checklist precisa caber em ~400px sem rolagem horizontal (verificado no e2e com Pixel 7). |
| 4.8 | T | Leitura sem sessão passa pelo login e volta ao destino (reaproveita a Fase 0) | Celular do técnico normalmente não está logado. |

## Fase 5 — Fechamento

| # | Tipo | Decisão | Motivo |
|---|---|---|---|
| 5.1 | T | `Button` passou a usar `forwardRef` | Os componentes shadcn foram gerados no estilo React 19 (`ref` como prop), mas o projeto usa React 18: o menu "Ações" da lista de equipamentos nunca era posicionado (ficava fora da tela). Defeito pré-existente, achado pelo e2e do fluxo completo; tem teste de regressão. |
| 5.2 | T | E2E "fluxo completo" num único cenário (cadastro → parada → preventiva com achado → correções → indicadores → configuração → etiqueta → desativação → perfil comum) | É a bateria final pedida; cobre também as funções antigas (CRUD, configurações, perfis). |
| 5.3 | T | Banco de desenvolvimento (Docker) recriado uma vez com `--reset` para receber o histórico | Continha só os dados de demonstração que o seed antigo recriava a cada start. |
| 5.4 | T | `TZ=America/Sao_Paulo` no container do backend | "Fim do dia" do prazo e indicadores precisam do horário da fábrica. |

---

## Dúvidas de domínio pendentes

1. **Prazos da corretiva (1.2):** 1 / 3 / 7 dias por criticidade estão adequados?
2. **Uma corretiva por preventiva (1.3):** ou cada item "Não OK" deveria virar uma ordem separada?
3. **Corretivas no KPI "Vencidas" (1.6):** o card deveria contar só preventivas? Hoje uma corretiva atrasada também aparece como vencida.
4. **Encerrar parada × corretiva (2.7):** encerrar a parada deveria exigir (ou fazer) a conclusão da corretiva vinculada?
5. **Quem registra parada (2.8):** operador de produção também deve poder registrar, ou só manutenção? Hoje qualquer usuário logado.
6. **Causas de parada (2.4):** as quatro categorias bastam ou a fábrica usa outra classificação (ex.: 6M)?
7. **Meta de cumprimento (3.2):** 90% é a meta que você quer mostrar no pitch?
8. **Disponibilidade em 24h (3.4 e 3.6):** usar operação contínua está bom, ou o pitch deve assumir turnos (ex.: 2 turnos, 16h/dia)? Turnos baixariam o tempo disponível e mudariam MTBF e disponibilidade.
9. **Destino do QR (4.2):** com a preventiva a mais de 3 dias, o técnico deveria cair no registro mesmo assim (adiantar a preventiva) em vez do detalhe?
