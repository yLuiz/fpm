Você é o Claude Code e vai gerar um MVP completo (código + docs) de um sistema web chamado:

“Factory Preventive Maintenance (FPM)”
Sistema de Manutenção Preventiva para o Chão de Fábrica, focado em 5 tipos de equipamentos:
1) Motores Elétricos
2) Compressores de Ar
3) Bombas Industriais
4) Esteiras Transportadoras
5) Painéis Elétricos / Quadros de Comando

OBJETIVO DO MVP
Criar um sistema simples e funcional para:
- Cadastrar equipamentos (com tipo, local, criticidade)
- Configurar frequência de manutenção por tipo (dias)
- Gerar automaticamente próximas manutenções (agenda)
- Registrar execução de manutenção (com checklist e observações)
- Listar manutenções “a vencer” e “vencidas”
- Gerar indicadores básicos (KPIs)

STACK (obrigatória)
- Backend: Node.js + TypeScript + NestJS
- DB: PostgreSQL
- ORM: Prisma
- API: REST + Swagger (OpenAPI)
- Auth: simples com JWT (apenas login e proteção básica)
- Frontend: React + Vite + TypeScript
- UI: TailwindCSS (ou Chakra, mas preferir Tailwind)
- Container: Docker Compose (postgres + backend + frontend)

REGRAS DE NEGÓCIO (fixas)
- Cada equipamento tem: id, nome, tipo (ENUM), local, criticidade (LOW/MEDIUM/HIGH), status (ACTIVE/INACTIVE), createdAt
- Cada tipo possui uma frequência default (pode ser alterada no sistema):
  - MOTOR: 30 dias
  - COMPRESSOR: 15 dias
  - PUMP: 30 dias
  - CONVEYOR: 15 dias
  - PANEL: 60 dias
- O sistema deve criar uma “Manutenção Programada” automaticamente para cada equipamento:
  - Ao criar um equipamento, gerar a primeira manutenção com dueDate = hoje + frequência do tipo
  - Ao concluir uma manutenção, gerar a próxima (dueDate = concludedAt + frequência do tipo)
- Status da manutenção:
  - SCHEDULED (agendada)
  - DONE (executada)
  - OVERDUE (vencida) -> calculada automaticamente quando dueDate < hoje e status != DONE
- Checklist por tipo (simples e fixo, armazenar como array de itens marcados):
  - MOTOR: ["Temperatura ok", "Ruído ok", "Lubrificação realizada"]
  - COMPRESSOR: ["Filtro verificado", "Vazamentos checados", "Pressão ok"]
  - PUMP: ["Vazamento checado", "Vibração ok", "Vedação ok"]
  - CONVEYOR: ["Alinhamento ok", "Tensão ok", "Motor ok"]
  - PANEL: ["Limpeza realizada", "Aperto de conexões", "Aquecimento checado"]
- Alertas:
  - Endpoint que lista “a vencer em X dias” (default X=3)
  - Endpoint que lista “vencidas”
  - (MVP) Sem email/SMS. Apenas listas no dashboard.

TELAS DO FRONTEND (mínimo)
1) Login
2) Dashboard:
   - Cards: total equipamentos, manutenções a vencer (3 dias), vencidas, realizadas no mês
   - Tabela: manutenções a vencer e vencidas
3) Equipamentos:
   - Listar, criar, editar, desativar
4) Detalhe do equipamento:
   - Histórico de manutenções
   - Botão “Registrar manutenção”
5) Registrar manutenção:
   - Mostrar checklist do tipo
   - Campos: concludedAt (default agora), observações
   - Ao salvar: marcar como DONE e criar a próxima manutenção automaticamente
6) Configurações:
   - Frequência por tipo (editar dias) (somente admin)

API (endpoints mínimos)
- POST /auth/login
- CRUD /equipment
- GET /maintenance/upcoming?days=3
- GET /maintenance/overdue
- GET /maintenance/by-equipment/:equipmentId
- POST /maintenance/:id/complete
- GET/PUT /settings/frequency (por tipo)

SEED
- Criar 1 usuário admin (email: admin@fpm.com senha: admin123)
- Criar 10 equipamentos variados (2 por tipo) com locais diferentes
- Gerar manutenções iniciais para cada equipamento

QUALIDADE / PADRÕES
- Código organizado (backend em módulos Nest: auth, equipment, maintenance, settings)
- DTOs com validação (class-validator)
- Swagger configurado com tags
- Tratamento de erro consistente
- No frontend: rotas protegidas, consumo via fetch/axios, páginas simples mas bem usáveis
- README completo com:
  - como rodar (docker compose)
  - comandos
  - endpoints
  - prints (pode ser descrito)
- Incluir arquivo .env.example para backend e frontend

ENTREGÁVEIS
1) Repositório com duas pastas: /backend e /frontend
2) docker-compose.yml na raiz
3) scripts de setup
4) documentação em README.md

CRITÉRIOS DE ACEITAÇÃO (não negociar)
- Subir com “docker compose up” e ficar acessível:
  - Frontend: http://localhost:5173 (ou 3000)
  - Backend: http://localhost:3001
  - Swagger: http://localhost:3001/api
- Login funcional
- CRUD de equipamentos funcional
- Agenda automática de manutenção funcionando (criar e completar gera próxima)
- Dashboard mostra listas e KPIs básicos
- Frequências configuráveis alteram o cálculo das próximas manutenções a partir da mudança

Agora gere TODO o código e os arquivos necessários, com instruções claras.
Não escreva apenas exemplos; entregue o projeto completo.

Mantenha o contexto do projeto com base nesse arquivo "./PITCH.md"