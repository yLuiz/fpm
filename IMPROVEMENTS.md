# Melhorias para Tornar o FPM Mais Robusto

## Prioridade Alta (Essencial para Produção)

### 1. Segurança

#### 1.1 Refresh Tokens
Implementar sistema de refresh tokens para maior segurança na autenticação.

```typescript
// backend/src/auth/auth.service.ts
async refreshToken(refreshToken: string) {
  // Validar refresh token
  // Gerar novo access token
  // Rotacionar refresh token
}
```

#### 1.2 Rate Limiting
Proteger contra ataques de força bruta.

```bash
npm install @nestjs/throttler
```

```typescript
// backend/src/app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10, // 10 requisições por minuto
    }),
  ],
})
```

#### 1.3 Helmet (Headers de Segurança)
```bash
npm install helmet
```

```typescript
// backend/src/main.ts
import helmet from 'helmet';
app.use(helmet());
```

#### 1.4 Validação de Senha Forte
```typescript
// Mínimo 8 caracteres, 1 maiúscula, 1 número, 1 especial
@Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
password: string;
```

---

### 2. Banco de Dados

#### 2.1 Criar Migrations Versionadas
```bash
npx prisma migrate dev --name init
```

#### 2.2 Adicionar Índices para Performance
```prisma
// prisma/schema.prisma
model Equipment {
  // ... campos existentes

  @@index([type])
  @@index([status])
  @@index([criticality])
}

model Maintenance {
  // ... campos existentes

  @@index([equipmentId])
  @@index([status])
  @@index([dueDate])
  @@index([status, dueDate]) // índice composto
}
```

#### 2.3 Soft Delete
Nunca deletar dados permanentemente.

```prisma
model Equipment {
  // ... campos existentes
  deletedAt DateTime?

  @@map("equipments")
}
```

```typescript
// Filtrar automaticamente registros deletados
findAll() {
  return this.prisma.equipment.findMany({
    where: { deletedAt: null }
  });
}
```

#### 2.4 Backup Automático
```yaml
# docker-compose.yml - adicionar serviço de backup
backup:
  image: prodrigestivill/postgres-backup-local
  environment:
    POSTGRES_HOST: postgres
    POSTGRES_DB: fpm_db
    POSTGRES_USER: fpm_user
    POSTGRES_PASSWORD: fpm_password
    SCHEDULE: "@daily"
    BACKUP_KEEP_DAYS: 7
  volumes:
    - ./backups:/backups
```

---

### 3. Logging e Monitoramento

#### 3.1 Sistema de Logs Estruturado
```bash
npm install winston nest-winston
```

```typescript
// backend/src/logger/logger.module.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

WinstonModule.forRoot({
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
})
```

#### 3.2 Audit Log (Quem fez o quê)
```prisma
model AuditLog {
  id        String   @id @default(uuid())
  userId    String
  action    String   // CREATE, UPDATE, DELETE
  entity    String   // Equipment, Maintenance
  entityId  String
  oldValue  Json?
  newValue  Json?
  createdAt DateTime @default(now())

  @@map("audit_logs")
}
```

#### 3.3 Health Check Endpoint
```typescript
// backend/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    };
  }
}
```

---

### 4. Tratamento de Erros

#### 4.1 Exception Filter Global
```typescript
// backend/src/filters/http-exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    // Log do erro
    this.logger.error({
      statusCode: status,
      path: request.url,
      method: request.method,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

---

## Prioridade Média (Melhor Experiência)

### 5. Frontend

#### 5.1 Toast Notifications
```bash
npm install react-hot-toast
```

```tsx
// Feedback visual para ações
toast.success('Equipamento criado com sucesso!');
toast.error('Erro ao salvar. Tente novamente.');
```

#### 5.2 Confirmação de Ações Destrutivas
```tsx
// Antes de deletar/desativar
const handleDelete = async () => {
  if (window.confirm('Tem certeza que deseja desativar este equipamento?')) {
    await equipmentApi.toggleStatus(id);
  }
};
```

#### 5.3 Loading Skeletons
```tsx
// Melhor UX durante carregamento
{loading ? (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
) : (
  <EquipmentList data={equipment} />
)}
```

#### 5.4 Validação de Formulários
```bash
npm install react-hook-form zod @hookform/resolvers
```

```tsx
const schema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  location: z.string().min(3, 'Localização obrigatória'),
  type: z.enum(['MOTOR', 'COMPRESSOR', 'PUMP', 'CONVEYOR', 'PANEL']),
});
```

#### 5.5 PWA (Progressive Web App)
```bash
npm install vite-plugin-pwa
```

Permite uso offline e instalação como app.

---

### 6. Funcionalidades de Negócio

#### 6.1 Notificações por Email
```bash
npm install @nestjs-modules/mailer nodemailer
```

```typescript
// Enviar email quando manutenção vencer
@Cron('0 8 * * *') // Todo dia às 8h
async sendOverdueNotifications() {
  const overdue = await this.maintenanceService.findOverdue();
  for (const maintenance of overdue) {
    await this.mailerService.sendMail({
      to: 'supervisor@fabrica.com',
      subject: `[URGENTE] Manutenção vencida: ${maintenance.equipment.name}`,
      template: 'overdue-maintenance',
      context: { maintenance },
    });
  }
}
```

#### 6.2 Exportação de Relatórios
```typescript
// Exportar histórico em PDF/Excel
@Get('export/:format')
async exportMaintenances(
  @Param('format') format: 'pdf' | 'excel',
  @Query('startDate') startDate: string,
  @Query('endDate') endDate: string,
) {
  // Gerar arquivo e retornar
}
```

#### 6.3 Filtros Avançados no Dashboard
```typescript
// Filtrar por período, tipo, criticidade
@Get('dashboard')
async getDashboard(
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string,
  @Query('type') type?: EquipmentType,
  @Query('criticality') criticality?: Criticality,
) {
  // Retornar dados filtrados
}
```

#### 6.4 Busca Global
```typescript
@Get('search')
async search(@Query('q') query: string) {
  return this.prisma.equipment.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
      ],
    },
  });
}
```

---

### 7. Testes

#### 7.1 Testes Unitários (Backend)
```bash
npm install --save-dev @nestjs/testing jest
```

```typescript
// backend/src/equipment/equipment.service.spec.ts
describe('EquipmentService', () => {
  it('should create equipment with initial maintenance', async () => {
    const equipment = await service.create({
      name: 'Motor Test',
      type: 'MOTOR',
      location: 'Test Location',
      criticality: 'HIGH',
    });

    expect(equipment.id).toBeDefined();
    // Verificar se manutenção foi criada
  });
});
```

#### 7.2 Testes E2E
```typescript
// test/equipment.e2e-spec.ts
describe('Equipment (e2e)', () => {
  it('/equipment (POST)', () => {
    return request(app.getHttpServer())
      .post('/equipment')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Motor', type: 'MOTOR', ... })
      .expect(201);
  });
});
```

#### 7.3 Testes Frontend
```bash
npm install --save-dev @testing-library/react vitest
```

---

## Prioridade Baixa (Nice to Have)

### 8. Performance

#### 8.1 Cache com Redis
```yaml
# docker-compose.yml
redis:
  image: redis:alpine
  ports:
    - "6379:6379"
```

```typescript
// Cachear consultas frequentes
@UseInterceptors(CacheInterceptor)
@Get('dashboard/stats')
getDashboardStats() {
  return this.maintenanceService.getDashboardStats();
}
```

#### 8.2 Paginação
```typescript
@Get()
findAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20,
) {
  return this.prisma.equipment.findMany({
    skip: (page - 1) * limit,
    take: limit,
  });
}
```

---

### 9. DevOps

#### 9.1 CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          cd backend && npm test
          cd ../frontend && npm test
```

#### 9.2 Docker Health Checks
```yaml
# docker-compose.yml
backend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

#### 9.3 Ambiente de Staging
```yaml
# docker-compose.staging.yml
# Ambiente idêntico à produção para testes
```

---

### 10. Funcionalidades Avançadas

#### 10.1 Multi-tenancy (Múltiplas Fábricas)
```prisma
model Factory {
  id         String      @id @default(uuid())
  name       String
  equipments Equipment[]
  users      User[]
}

model Equipment {
  factoryId String
  factory   Factory @relation(...)
}
```

#### 10.2 Gestão de Peças de Reposição
```prisma
model SparePart {
  id           String @id @default(uuid())
  name         String
  code         String @unique
  quantity     Int
  minQuantity  Int    // Alerta quando abaixo
  equipmentTypes EquipmentType[]
}
```

#### 10.3 Integração IoT
```typescript
// Receber dados de sensores
@Post('iot/sensor-data')
async receiveSensorData(@Body() data: SensorDataDto) {
  // Temperatura, vibração, pressão
  // Gerar alertas automáticos se fora do padrão
}
```

#### 10.4 Dashboard com Gráficos
```bash
npm install recharts
```

```tsx
// Gráfico de manutenções por mês
<LineChart data={maintenancesByMonth}>
  <XAxis dataKey="month" />
  <YAxis />
  <Line type="monotone" dataKey="completed" stroke="#22c55e" />
  <Line type="monotone" dataKey="overdue" stroke="#ef4444" />
</LineChart>
```

---

## Checklist de Implementação

### Fase 1 - Segurança (1-2 dias)
- [ ] Adicionar Helmet
- [ ] Implementar Rate Limiting
- [ ] Validação de senha forte
- [ ] Exception Filter global

### Fase 2 - Banco de Dados (1 dia)
- [ ] Criar migrations versionadas
- [ ] Adicionar índices
- [ ] Implementar soft delete
- [ ] Configurar backup automático

### Fase 3 - Logging (1 dia)
- [ ] Configurar Winston
- [ ] Criar tabela de audit log
- [ ] Implementar health check

### Fase 4 - Frontend UX (2-3 dias)
- [ ] Adicionar toast notifications
- [ ] Implementar confirmações
- [ ] Melhorar loading states
- [ ] Validação de formulários

### Fase 5 - Testes (2-3 dias)
- [ ] Testes unitários backend
- [ ] Testes E2E
- [ ] Testes frontend

### Fase 6 - Funcionalidades (3-5 dias)
- [ ] Notificações por email
- [ ] Exportação de relatórios
- [ ] Filtros avançados
- [ ] Busca global

---

## Estimativa Total

| Fase | Tempo | Prioridade |
|------|-------|------------|
| Segurança | 1-2 dias | Alta |
| Banco de Dados | 1 dia | Alta |
| Logging | 1 dia | Alta |
| Frontend UX | 2-3 dias | Média |
| Testes | 2-3 dias | Média |
| Funcionalidades | 3-5 dias | Média |
| **Total** | **10-15 dias** | - |

Com essas melhorias, o sistema estará pronto para uso em produção em ambiente real de fábrica.
