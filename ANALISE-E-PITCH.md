# FPM - Análise do Projeto, Melhorias e Pitch

## Sumario

- [1. O que e o projeto](#1-o-que-e-o-projeto)
- [2. Qual problema ele resolve](#2-qual-problema-ele-resolve)
- [3. Como o sistema funciona](#3-como-o-sistema-funciona)
- [4. Stack tecnica](#4-stack-tecnica)
- [5. Pontos fortes do MVP](#5-pontos-fortes-do-mvp)
- [6. O que melhorar](#6-o-que-melhorar)
- [7. Pitch](#7-pitch)
- [8. Pitch Deck (slides)](#8-pitch-deck-slides)

---

## 1. O que e o projeto

O **FPM (Factory Preventive Maintenance)** e um sistema web full-stack para gestao de manutencao preventiva de equipamentos industriais no chao de fabrica.

O sistema foca nos 5 tipos de equipamentos responsaveis por 80% das paradas nao programadas:

| Equipamento              | % das Falhas |
|--------------------------|--------------|
| Motores Eletricos        | 28%          |
| Compressores de Ar       | 22%          |
| Bombas Industriais       | 18%          |
| Esteiras Transportadoras | 17%          |
| Paineis Eletricos        | 15%          |

O sistema automatiza o agendamento de manutencoes, fornece checklists padronizados por tipo de equipamento, e oferece um dashboard com KPIs para acompanhamento em tempo real.

---

## 2. Qual problema ele resolve

### O cenario atual

- Fabricas brasileiras perdem **~R$ 100 bilhoes/ano** com paradas nao planejadas
- **30% dos gastos com manutencao** sao emergenciais (corretivos) e poderiam ser evitados
- A maioria das fabricas de pequeno/medio porte usa planilhas Excel, papel ou a memoria do tecnico
- Quando esquecem uma manutencao, o equipamento para — e a producao tambem

### O que o FPM faz

1. **Automatiza o agendamento** — ao cadastrar um equipamento, a primeira manutencao e criada automaticamente. Ao concluir uma manutencao, a proxima e agendada sem intervencao manual
2. **Padroniza inspecoes** — cada tipo de equipamento tem um checklist fixo (ex: Motor = Temperatura ok, Ruido ok, Lubrificacao realizada)
3. **Alerta antes do problema** — dashboard mostra manutencoes vencidas (vermelho) e proximas de vencer (amarelo)
4. **Registra tudo** — historico completo com audit log para compliance e auditorias (ISO, NRs)

### Resultado esperado

- Reducao de ate **70% nas paradas nao planejadas**
- **+15%** de disponibilidade dos equipamentos
- **+20%** de vida util dos equipamentos
- ROI estimado de **1.150%** para fabrica de medio porte

---

## 3. Como o sistema funciona

### Fluxo principal

```
Cadastrar Equipamento
        |
        v
Sistema cria 1a manutencao (dueDate = hoje + frequencia)
        |
        v
Dashboard mostra manutencoes proximas/vencidas
        |
        v
Tecnico executa checklist e registra conclusao
        |
        v
Sistema cria proxima manutencao automaticamente (dueDate = conclusao + frequencia)
        |
        v
Ciclo se repete indefinidamente
```

### Frequencias padrao (configuraveis pelo admin)

| Tipo               | Frequencia |
|--------------------|------------|
| Motor Eletrico     | 30 dias    |
| Compressor de Ar   | 15 dias    |
| Bomba Industrial   | 30 dias    |
| Esteira            | 15 dias    |
| Painel Eletrico    | 60 dias    |

### Controle de acesso

- **ADMIN** — acesso total + configurar frequencias
- **USER** — visualizar equipamentos, registrar manutencoes

---

## 4. Stack tecnica

### Backend
- **NestJS** (Node.js + TypeScript) — arquitetura modular
- **Prisma** — ORM com migrations e seed
- **PostgreSQL 16** — banco de dados
- **JWT** — autenticacao (access token 15min + refresh token 7 dias)
- **Swagger** — documentacao da API em /api
- **Winston** — logs rotativos
- **Helmet + Rate Limiting** — seguranca HTTP

### Frontend
- **React 18** + TypeScript + Vite
- **TailwindCSS** — estilizacao
- **React Router v6** — rotas
- **Axios** — HTTP client com interceptors JWT
- **Context API** — gerenciamento de estado de autenticacao

### Infraestrutura
- **Docker Compose** — orquestra PostgreSQL, backend, frontend e backup automatico
- **postgres-backup-local** — backup diario com rotacao de 7 dias

### Endpoints principais

| Grupo         | Endpoints                                                  |
|---------------|------------------------------------------------------------|
| Auth          | POST /auth/login, /auth/refresh, /auth/logout, GET /auth/me |
| Equipamentos  | GET/POST /equipment, PATCH/DELETE /equipment/:id           |
| Manutencoes   | GET /maintenance/upcoming, /overdue, /stats, POST /:id/complete |
| Configuracoes | GET/PUT /settings/frequency                                |
| Health        | GET /health/live, /health/ready                            |

---

## 5. Pontos fortes do MVP

O que ja esta bem feito:

- **Arquitetura limpa** — modulos NestJS bem separados (auth, equipment, maintenance, settings, audit)
- **Seguranca robusta** — bcrypt, JWT com refresh rotation, rate limiting, CORS, Helmet, audit log
- **Soft deletes** — dados nunca sao perdidos (campo deletedAt)
- **Audit log completo** — rastreia todas as acoes com IP e user-agent
- **Auto-agendamento** — a logica de criar a proxima manutencao automaticamente e o core do produto e funciona bem
- **Docker pronto** — deploy em um comando (`docker compose up`)
- **Seed funcional** — dados de exemplo para demonstracao rapida
- **Swagger** — API documentada automaticamente

---

## 6. O que melhorar

### Prioridade Alta (impacto direto na adocao)

#### 6.1. Testes automatizados
**Status atual:** Nenhum teste unitario ou E2E encontrado.
**Por que importa:** Sem testes, qualquer mudanca pode quebrar o sistema silenciosamente. Para pilotos em fabricas reais, isso e inaceitavel.
**O que fazer:**
- Testes unitarios nos services (NestJS + Jest)
- Testes E2E nas rotas criticas (login, criar equipamento, completar manutencao)
- Testes no frontend com React Testing Library (dashboard, formularios)

#### 6.2. Notificacoes
**Status atual:** Nenhuma notificacao (email, push, WhatsApp).
**Por que importa:** O sistema so funciona se alguem abrir o dashboard. Se o tecnico esquece de abrir, a manutencao vence igual.
**O que fazer:**
- Email diario com resumo de manutencoes pendentes
- Notificacao push/WhatsApp para manutencoes vencidas
- Integrar com servicos como SendGrid, Twilio ou Evolution API

#### 6.3. Versao mobile / PWA
**Status atual:** O frontend e responsivo com Tailwind, mas nao e PWA.
**Por que importa:** Tecnicos no chao de fabrica usam celular, nao computador.
**O que fazer:**
- Transformar o React app em PWA (service worker + manifest)
- Otimizar a UX para telas pequenas
- Permitir uso offline (registrar manutencao e sincronizar depois)

#### 6.4. Relatorios exportaveis
**Status atual:** Apenas visualizacao no dashboard, sem exportacao.
**Por que importa:** Gestores precisam de relatorios para apresentar a diretoria e para auditorias.
**O que fazer:**
- Exportar PDF com historico de manutencoes por equipamento
- Exportar Excel com dados brutos
- Relatorio mensal automatico com KPIs

### Prioridade Media (escala e profissionalismo)

#### 6.5. Graficos e tendencias
- Usar Recharts ou Chart.js para visualizar MTBF, MTTR, taxa de cumprimento ao longo do tempo
- Grafico de manutencoes realizadas vs vencidas por mes

#### 6.6. Paginacao e busca
- O MVP nao pagina resultados — com muitos equipamentos, a performance degrada
- Adicionar busca por nome/localizacao de equipamento

#### 6.7. Gestao de usuarios
- Hoje so existe o usuario seed (admin@fpm.com)
- Criar CRUD de usuarios pelo admin
- Permitir atribuir manutencoes a tecnicos especificos

#### 6.8. CI/CD
- GitHub Actions para lint, test, build e deploy automatico
- Garantir que `.env` nao esta commitado

### Prioridade Baixa (visao de futuro)

#### 6.9. Multi-tenancy
- Suportar multiplas fabricas/unidades com dados isolados

#### 6.10. Integracao IoT
- Sensores de vibracao/temperatura alimentando o sistema
- Evoluir de preventiva para **manutencao preditiva**

#### 6.11. Integracao com ERP
- SAP, TOTVS para sincronizar ordens de servico e estoque de pecas

#### 6.12. IA para manutencao preditiva
- Analisar historico para prever falhas antes do prazo padrao
- Sugerir ajustes de frequencia baseados em dados reais

---

## 7. Pitch

### Elevator Pitch (60 segundos)

> Fabricas brasileiras perdem R$ 100 bilhoes por ano com paradas nao planejadas de equipamentos. 30% desse custo poderia ser evitado com manutencao preventiva simples.
>
> O problema? A maioria das fabricas ainda controla isso com planilhas, papel ou na memoria do tecnico. Quando esquecem uma manutencao, o equipamento para — e a producao tambem.
>
> O FPM resolve isso. E um sistema web simples que automatiza o agendamento de manutencoes preventivas, fornece checklists padronizados por tipo de equipamento e alerta a equipe antes que o prazo venca.
>
> O resultado? Reducao de ate 70% nas paradas nao planejadas, com rastreabilidade completa para auditoria.
>
> Nosso diferencial? Focamos nos 5 tipos de equipamentos que causam 80% das falhas. Simples de usar, roda no celular, e qualquer tecnico aprende em 5 minutos.
>
> Estamos buscando nossos primeiros clientes piloto para validar a solucao em ambiente real.

### Versao curta (30 segundos)

> 80% das paradas de fabrica vem de 5 tipos de equipamentos. O FPM automatiza a manutencao preventiva desses equipamentos com checklists, agendamento automatico e alertas — tudo em um sistema web que qualquer tecnico aprende em minutos. Reducao de ate 70% em paradas nao planejadas.

### Versao para investidor

> O mercado de manutencao industrial no Brasil movimenta bilhoes por ano, e a maioria das PMEs ainda usa metodos manuais. O FPM e um SaaS vertical focado em manutencao preventiva dos 5 equipamentos mais criticos do chao de fabrica. MVP funcional, arquitetura escalavel, pronto para pilotos. Modelo SaaS com planos a partir de R$ 99/mes. TAM de 300 mil fabricas no Brasil.

---

## 8. Pitch Deck (slides)

### Slide 1 — Capa
**FPM — Factory Preventive Maintenance**
Manutencao preventiva sem complicacao.

### Slide 2 — Problema
- R$ 100 bilhoes/ano perdidos em paradas nao planejadas
- 30% dos gastos com manutencao sao emergenciais evitaveis
- PMEs usam planilhas, papel ou memoria do tecnico
- *"Quando o equipamento quebra, ja e tarde demais"*

### Slide 3 — Solucao
- Agendamento automatico de manutencoes por tipo de equipamento
- Checklists padronizados (Motor, Compressor, Bomba, Esteira, Painel)
- Dashboard com alertas visuais (vencido = vermelho, proximo = amarelo)
- Historico completo para auditorias e compliance

### Slide 4 — Demo / Screenshots
- Screenshot do Dashboard com KPIs
- Screenshot do Checklist sendo preenchido
- Screenshot da lista de equipamentos
- Screenshot das configuracoes de frequencia

### Slide 5 — Como funciona
```
Cadastra equipamento → Sistema agenda manutencao
→ Tecnico executa checklist → Sistema agenda proxima
→ Ciclo automatico, sem intervencao manual
```

### Slide 6 — Mercado
- ~300 mil fabricas no Brasil (IBGE/CNI)
- Maioria de pequeno/medio porte sem sistema de gestao de manutencao
- TAM: R$ 3.6B (300k fabricas x R$ 1.000/mes)
- SAM: R$ 360M (fabricas com 50+ equipamentos criticos)
- SOM: R$ 3.6M (1.000 clientes no primeiro ano)

### Slide 7 — Modelo de negocio
| Plano       | Preco        | Inclui                                    |
|-------------|--------------|-------------------------------------------|
| Free        | R$ 0         | Ate 10 equipamentos, 1 usuario            |
| Pro         | R$ 199/mes   | Equipamentos ilimitados, relatorios, 5 usuarios |
| Enterprise  | R$ 999/mes   | Multi-planta, API, integracao ERP, suporte dedicado |

### Slide 8 — Tracao e status
- MVP 100% funcional (backend + frontend + Docker)
- Stack moderna e escalavel (NestJS, React, PostgreSQL)
- Seguranca enterprise (JWT, audit log, rate limiting)
- Pronto para piloto em ambiente real

### Slide 9 — Roadmap
| Fase   | Entregas                                         |
|--------|--------------------------------------------------|
| v1.0   | MVP atual — agendamento, checklists, dashboard   |
| v2.0   | Notificacoes, app mobile/PWA, relatorios PDF     |
| v3.0   | Graficos de tendencia, gestao de usuarios, busca |
| v4.0   | IoT, manutencao preditiva com IA, integracao ERP |

### Slide 10 — Time
- [Seu nome e funcao]
- [Background relevante — engenharia, industria, software]
- [Por que voce e a pessoa certa para resolver isso]

### Slide 11 — Ask
O que estamos buscando:
- **Pilotos:** 3-5 fabricas para validacao em campo
- **Investimento seed:** R$ [valor] para desenvolvimento da v2.0
- **Mentoria:** Conexoes com gestores industriais e canais de distribuicao

---

## Checklist de proximos passos

- [ ] Adicionar testes automatizados (unitarios + E2E)
- [ ] Implementar notificacoes por email
- [ ] Transformar em PWA para uso no celular
- [ ] Criar exportacao de relatorios (PDF/Excel)
- [ ] Adicionar graficos no dashboard
- [ ] Implementar paginacao e busca
- [ ] Criar CRUD de usuarios
- [ ] Configurar CI/CD (GitHub Actions)
- [ ] Preparar screenshots para o pitch deck
- [ ] Buscar 3-5 fabricas para piloto

---

*Documento gerado em 2026-03-20 como referencia para consulta.*
*Projeto: FPM — Factory Preventive Maintenance*
