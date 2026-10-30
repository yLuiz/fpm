# FPM - Factory Preventive Maintenance

Sistema de Manutenção Preventiva para Chão de Fábrica, focado em 5 tipos de equipamentos:
- Motores Elétricos
- Compressores de Ar
- Bombas Industriais
- Esteiras Transportadoras
- Painéis Elétricos / Quadros de Comando

## Funcionalidades

- Cadastro de equipamentos (com tipo, local, criticidade)
- Configuração de frequência de manutenção por tipo (dias)
- Geração automática de próximas manutenções (agenda)
- Registro de execução de manutenção com checklist OK / Não OK / N.A.
- Item "Não OK" abre ordem corretiva automaticamente (prazo pela criticidade)
- Registro de paradas não planejadas (equipamento "Parado" em todas as telas)
- Listagem de manutenções "a vencer" e "vencidas" (preventivas e corretivas)
- Dashboard com abas **Operação** e **Indicadores** (cumprimento do plano, atraso médio, MTBF, MTTR, disponibilidade, paradas com/sem preventiva vencida)
- Etiquetas com QR Code: o técnico escaneia no celular e cai direto na pendência do equipamento

## Stack Tecnológica

### Backend
- Node.js + TypeScript
- NestJS
- PostgreSQL
- Prisma ORM
- REST API + Swagger (OpenAPI)
- JWT para autenticação

### Frontend
- React + Vite + TypeScript
- TailwindCSS
- React Router DOM
- Axios

### Infraestrutura
- Docker Compose

## Como Executar

### Pré-requisitos
- Docker e Docker Compose instalados

### Execução com Docker

1. Clone o repositório e entre na pasta do projeto:
```bash
cd Descomplica
```

2. Inicie os containers:
```bash
docker compose up --build
```

3. Aguarde todos os serviços iniciarem. Os seguintes endpoints estarão disponíveis:
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:3001
   - **Swagger**: http://localhost:3001/api

### Credenciais de Acesso

**Usuário Admin:**
- Email: `admin@fpm.com`
- Senha: `admin123`

**Usuário comum:** `user@fpm.com` / `user123`

### Dados de demonstração

O seed roda a cada start do backend, mas **só popula um banco vazio** (não apaga dados registrados).
Ele gera 10 equipamentos com 6 meses de histórico (preventivas, corretivas e paradas). Para recriar tudo:

```bash
docker exec fpm-backend npx ts-node prisma/seed.ts --reset
```

### QR Code no celular

`localhost` no celular aponta para o próprio aparelho. Para as etiquetas funcionarem, abra o sistema pelo
IP da máquina na rede (ex.: `http://192.168.0.10:5173`) ou suba com `FPM_PUBLIC_URL=http://192.168.0.10:5173 docker compose up`.
O frontend encontra a API no mesmo host, porta 3001.

## Execução Local (Desenvolvimento)

### Backend

1. Entre na pasta do backend:
```bash
cd backend
```

2. Copie o arquivo de ambiente:
```bash
cp .env.example .env
```

3. Instale as dependências:
```bash
npm install
```

4. Execute as migrações do banco:
```bash
npm run prisma:migrate
```

5. Execute o seed para popular dados iniciais:
```bash
npm run prisma:seed
```

6. Inicie o servidor:
```bash
npm run start:dev
```

### Frontend

1. Entre na pasta do frontend:
```bash
cd frontend
```

2. Copie o arquivo de ambiente:
```bash
cp .env.example .env
```

3. Instale as dependências:
```bash
npm install
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## Endpoints da API

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/login` | Login do usuário |
| GET | `/auth/me` | Dados do usuário autenticado |

### Equipamentos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/equipment` | Listar todos os equipamentos |
| GET | `/equipment/:id` | Buscar equipamento por ID |
| POST | `/equipment` | Criar novo equipamento |
| PATCH | `/equipment/:id` | Atualizar equipamento |
| PATCH | `/equipment/:id/toggle-status` | Alternar status (ativo/inativo) |
| DELETE | `/equipment/:id` | Remover equipamento |

### Manutenções
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/maintenance/upcoming?days=3` | Listar manutenções a vencer |
| GET | `/maintenance/overdue` | Listar manutenções vencidas |
| GET | `/maintenance/stats` | Estatísticas do dashboard |
| GET | `/maintenance/checklist/:type` | Obter checklist por tipo |
| GET | `/maintenance/by-equipment/:id` | Manutenções por equipamento |
| GET | `/maintenance/:id` | Buscar manutenção por ID |
| POST | `/maintenance/:id/complete` | Concluir manutenção |

`POST /maintenance/:id/complete` recebe o checklist como `[{ item, result: 'OK' | 'NOK' | 'NA', note? }]`
(nota obrigatória no NOK) e devolve `{ maintenance, next, corrective }`. Corretiva exige `observations` (solução aplicada).

### Paradas
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/downtime` | Registrar parada (`openCorrective: true` abre corretiva) |
| GET | `/downtime?open=&equipmentId=&from=&to=` | Listar paradas |
| GET | `/downtime/:id` | Buscar parada |
| PATCH | `/downtime/:id/close` | Encerrar parada |

### Indicadores
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/metrics/summary?from=&to=` | Cumprimento, atraso médio, MTBF, MTTR, disponibilidade (padrão: 30 dias) |
| GET | `/metrics/monthly?months=6` | Série mensal de cumprimento e paradas |

### Configurações
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/settings/frequency` | Listar frequências por tipo |
| PUT | `/settings/frequency/:type` | Atualizar frequência (admin) |

## Testes

Requer o Postgres do docker compose rodando (os testes usam os bancos `fpm_test` e `fpm_e2e`, criados uma vez com
`docker exec fpm-postgres psql -U fpm_user -d fpm_db -c "CREATE DATABASE fpm_test" -c "CREATE DATABASE fpm_e2e"`).

| Onde | Comando | O que cobre |
|---|---|---|
| backend | `npm test` | Unitários (regras puras, services com Prisma mockado) |
| backend | `npm run test:int` | Integração com banco real (`fpm_test`) |
| backend | `npm run test:e2e` | API HTTP completa (supertest) |
| backend | `npm run test:all` | Os três acima |
| frontend | `npm test` | Unitários e integração (Vitest + Testing Library) |
| frontend | `npm run test:e2e` | Navegador (Playwright): sobe backend e frontend próprios (portas 3101/5180, banco `fpm_e2e`) |

Primeira vez no Playwright: `npx playwright install chromium`.

## Estrutura do Projeto

```
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Definição do banco de dados
│   │   └── seed.ts          # Script de seed
│   ├── src/
│   │   ├── auth/            # Módulo de autenticação
│   │   ├── equipment/       # Módulo de equipamentos
│   │   ├── maintenance/     # Módulo de manutenções
│   │   ├── prisma/          # Serviço do Prisma
│   │   ├── settings/        # Módulo de configurações
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── contexts/        # Contextos React (Auth)
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── services/        # Serviços de API
│   │   ├── types/           # Tipos TypeScript
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Regras de Negócio

### Frequências de Manutenção (Padrão)
| Tipo | Frequência |
|------|------------|
| Motor Elétrico | 30 dias |
| Compressor | 15 dias |
| Bomba Industrial | 30 dias |
| Esteira Transportadora | 15 dias |
| Painel Elétrico | 60 dias |

### Checklist por Tipo
- **Motor**: Temperatura ok, Ruído ok, Lubrificação realizada
- **Compressor**: Filtro verificado, Vazamentos checados, Pressão ok
- **Bomba**: Vazamento checado, Vibração ok, Vedação ok
- **Esteira**: Alinhamento ok, Tensão ok, Motor ok
- **Painel**: Limpeza realizada, Aperto de conexões, Aquecimento checado

### Status de Manutenção
- **SCHEDULED**: Manutenção agendada
- **DONE**: Manutenção executada
- **OVERDUE**: Calculado automaticamente quando dueDate < hoje e status != DONE

### Fluxo de Manutenção
1. Ao criar um equipamento, uma manutenção é gerada com dueDate = hoje + frequência do tipo
2. Ao concluir uma manutenção, a próxima é gerada automaticamente com dueDate = concludedAt + frequência do tipo

## Telas

### 1. Login
- Autenticação com email e senha
- Credencial de teste: admin@fpm.com / admin123

### 2. Dashboard
- Cards com KPIs: Total de equipamentos, Manutenções a vencer (3 dias), Vencidas, Realizadas no mês
- Tabelas: Manutenções vencidas e a vencer

### 3. Equipamentos
- Lista de equipamentos com filtro por status
- Criação, edição e desativação de equipamentos

### 4. Detalhe do Equipamento
- Informações do equipamento
- Próxima manutenção agendada
- Histórico completo de manutenções
- Botão para registrar manutenção

### 5. Registrar Manutenção
- Checklist do tipo de equipamento
- Campo de data/hora da conclusão
- Campo de observações
- Ao salvar: marca como DONE e cria próxima manutenção

### 6. Configurações
- Frequência de manutenção por tipo (editável apenas por admin)

## Licença

MIT
