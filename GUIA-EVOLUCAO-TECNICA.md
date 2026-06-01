# FPM - Guia de Evolucao Tecnica

## Objetivo

Aplicar **Kubernetes, AWS, DDD e CI/CD** ao projeto FPM de forma pratica e incremental.
Cada secao explica **o que fazer**, **por que** e **como** — com exemplos concretos baseados no codigo atual.

---

## Sumario

- [1. DDD — Domain-Driven Design](#1-ddd--domain-driven-design)
- [2. CI/CD — Integracao e Entrega Continua](#2-cicd--integracao-e-entrega-continua)
- [3. Kubernetes](#3-kubernetes)
- [4. AWS — Infraestrutura Cloud](#4-aws--infraestrutura-cloud)
- [5. Ordem de execucao recomendada](#5-ordem-de-execucao-recomendada)

---

## 1. DDD — Domain-Driven Design

### Estado atual

O backend usa modulos NestJS (auth, equipment, maintenance, settings), mas:
- Services misturam logica de negocio com acesso ao Prisma (infraestrutura)
- Nao existem Value Objects, Aggregates ou Domain Events
- DTOs servem para validacao de entrada, mas o dominio nao tem representacao propria

### O que mudar

#### 1.1. Reorganizar em camadas (Hexagonal / Ports & Adapters)

Estrutura atual:
```
src/
  equipment/
    equipment.module.ts
    equipment.service.ts      ← mistura dominio + infra
    equipment.controller.ts
    dto/
```

Estrutura proposta:
```
src/
  equipment/
    domain/
      entities/
        equipment.entity.ts        ← Aggregate Root
      value-objects/
        equipment-type.vo.ts       ← EquipmentType com regras
        criticality.vo.ts
        location.vo.ts
      events/
        equipment-created.event.ts
      repositories/
        equipment.repository.ts    ← Interface (Port)
    application/
      use-cases/
        create-equipment.use-case.ts
        toggle-status.use-case.ts
        list-equipment.use-case.ts
      dto/
        create-equipment.dto.ts
    infrastructure/
      persistence/
        prisma-equipment.repository.ts  ← Implementacao (Adapter)
      controllers/
        equipment.controller.ts
    equipment.module.ts
```

#### 1.2. Criar a entidade de dominio (Aggregate Root)

Hoje o `equipment.service.ts` faz tudo direto no Prisma. O dominio precisa existir como classe propria:

```typescript
// equipment/domain/entities/equipment.entity.ts

export class Equipment {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: EquipmentType,
    public readonly location: string,
    public readonly criticality: Criticality,
    private _status: EquipmentStatus,
  ) {}

  static create(props: CreateEquipmentProps): Equipment {
    if (!props.name || props.name.trim().length < 2) {
      throw new DomainException('Nome do equipamento deve ter ao menos 2 caracteres');
    }
    return new Equipment(
      randomUUID(),
      props.name.trim(),
      props.type,
      props.location,
      props.criticality,
      EquipmentStatus.ACTIVE,
    );
  }

  toggleStatus(): void {
    this._status = this._status === EquipmentStatus.ACTIVE
      ? EquipmentStatus.INACTIVE
      : EquipmentStatus.ACTIVE;
  }

  get status(): EquipmentStatus {
    return this._status;
  }

  get isActive(): boolean {
    return this._status === EquipmentStatus.ACTIVE;
  }
}
```

#### 1.3. Criar a interface do repositorio (Port)

```typescript
// equipment/domain/repositories/equipment.repository.ts

export interface EquipmentRepository {
  findById(id: string): Promise<Equipment | null>;
  findAll(filter?: EquipmentFilter): Promise<Equipment[]>;
  save(equipment: Equipment): Promise<void>;
  delete(id: string): Promise<void>;
}
```

#### 1.4. Implementar o repositorio com Prisma (Adapter)

```typescript
// equipment/infrastructure/persistence/prisma-equipment.repository.ts

@Injectable()
export class PrismaEquipmentRepository implements EquipmentRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Equipment | null> {
    const data = await this.prisma.equipment.findFirst({
      where: { id, deletedAt: null },
    });
    return data ? this.toDomain(data) : null;
  }

  async save(equipment: Equipment): Promise<void> {
    await this.prisma.equipment.upsert({
      where: { id: equipment.id },
      create: this.toPersistence(equipment),
      update: this.toPersistence(equipment),
    });
  }

  private toDomain(raw: PrismaEquipment): Equipment {
    return Equipment.reconstitute({ ...raw });
  }

  private toPersistence(entity: Equipment): PrismaEquipmentData {
    return { name: entity.name, type: entity.type, /* ... */ };
  }
}
```

#### 1.5. Criar Use Cases

```typescript
// equipment/application/use-cases/create-equipment.use-case.ts

@Injectable()
export class CreateEquipmentUseCase {
  constructor(
    @Inject('EquipmentRepository')
    private readonly equipmentRepo: EquipmentRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(dto: CreateEquipmentDto): Promise<string> {
    const equipment = Equipment.create(dto);
    await this.equipmentRepo.save(equipment);
    this.eventBus.publish(new EquipmentCreatedEvent(equipment.id, equipment.type));
    return equipment.id;
  }
}
```

#### 1.6. Domain Events

Hoje, quando um equipamento e criado, o `equipment.service.ts` chama o `maintenance.service.ts` diretamente — acoplamento forte. Com Domain Events:

```typescript
// equipment/domain/events/equipment-created.event.ts
export class EquipmentCreatedEvent {
  constructor(
    public readonly equipmentId: string,
    public readonly equipmentType: EquipmentType,
  ) {}
}

// maintenance/application/handlers/on-equipment-created.handler.ts
@EventsHandler(EquipmentCreatedEvent)
export class OnEquipmentCreatedHandler implements IEventHandler<EquipmentCreatedEvent> {
  constructor(private maintenanceRepo: MaintenanceRepository) {}

  async handle(event: EquipmentCreatedEvent): Promise<void> {
    const frequency = await this.getFrequency(event.equipmentType);
    const maintenance = Maintenance.scheduleFirst(event.equipmentId, frequency);
    await this.maintenanceRepo.save(maintenance);
  }
}
```

O NestJS tem suporte nativo a isso via `@nestjs/cqrs`.

#### 1.7. Bounded Contexts do FPM

```
┌─────────────────────────────────┐
│   Equipment Management          │  ← Cadastro e ciclo de vida de equipamentos
│   (Aggregate: Equipment)        │
└────────────┬────────────────────┘
             │ EquipmentCreatedEvent
             │ EquipmentDeactivatedEvent
             ▼
┌─────────────────────────────────┐
│   Maintenance Scheduling        │  ← Agendamento e execucao de manutencoes
│   (Aggregate: Maintenance)      │
└────────────┬────────────────────┘
             │ MaintenanceCompletedEvent
             ▼
┌─────────────────────────────────┐
│   Audit & Compliance            │  ← Rastreabilidade e logs
│   (Listens to all events)       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   Identity & Access             │  ← Autenticacao e autorizacao
│   (Aggregate: User)             │
└─────────────────────────────────┘
```

---

## 2. CI/CD — Integracao e Entrega Continua

### Estado atual

Nenhum pipeline configurado. Zero testes automatizados.

### O que implementar

#### 2.1. GitHub Actions — Pipeline completo

Criar `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  BACKEND_IMAGE: ghcr.io/${{ github.repository }}/backend
  FRONTEND_IMAGE: ghcr.io/${{ github.repository }}/frontend

jobs:
  # ──────────────── LINT ────────────────
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: |
            backend/package-lock.json
            frontend/package-lock.json

      - name: Lint Backend
        working-directory: backend
        run: |
          npm ci
          npm run lint

      - name: Lint Frontend
        working-directory: frontend
        run: |
          npm ci
          npm run lint

  # ──────────────── TEST ────────────────
  test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
          POSTGRES_DB: fpm_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Test Backend
        working-directory: backend
        env:
          DATABASE_URL: postgresql://test_user:test_pass@localhost:5432/fpm_test
          JWT_SECRET: test-secret
          JWT_REFRESH_SECRET: test-refresh-secret
          JWT_EXPIRES_IN: 15m
        run: |
          npm ci
          npx prisma migrate deploy
          npm run test
          npm run test:e2e

      - name: Test Frontend
        working-directory: frontend
        run: |
          npm ci
          npm run test

  # ──────────────── BUILD & PUSH ────────────────
  build:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ${{ env.BACKEND_IMAGE }}:${{ github.sha }}
            ${{ env.BACKEND_IMAGE }}:latest

      - name: Build and push Frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: |
            ${{ env.FRONTEND_IMAGE }}:${{ github.sha }}
            ${{ env.FRONTEND_IMAGE }}:latest

  # ──────────────── DEPLOY ────────────────
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name fpm-cluster --region us-east-1

      - name: Deploy to Staging
        run: |
          kubectl set image deployment/fpm-backend \
            backend=${{ env.BACKEND_IMAGE }}:${{ github.sha }} \
            -n fpm-staging
          kubectl set image deployment/fpm-frontend \
            frontend=${{ env.FRONTEND_IMAGE }}:${{ github.sha }} \
            -n fpm-staging
          kubectl rollout status deployment/fpm-backend -n fpm-staging
          kubectl rollout status deployment/fpm-frontend -n fpm-staging

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production  # requer aprovacao manual no GitHub
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name fpm-cluster --region us-east-1

      - name: Deploy to Production
        run: |
          kubectl set image deployment/fpm-backend \
            backend=${{ env.BACKEND_IMAGE }}:${{ github.sha }} \
            -n fpm-production
          kubectl set image deployment/fpm-frontend \
            frontend=${{ env.FRONTEND_IMAGE }}:${{ github.sha }} \
            -n fpm-production
          kubectl rollout status deployment/fpm-backend -n fpm-production
          kubectl rollout status deployment/fpm-frontend -n fpm-production
```

#### 2.2. Fluxo visual do pipeline

```
Push/PR
  │
  ├─► Lint (ESLint backend + frontend)
  │     │
  │     ▼
  ├─► Test (Jest + PostgreSQL real no CI)
  │     │
  │     ▼ (somente branch main)
  ├─► Build (Docker images → GitHub Container Registry)
  │     │
  │     ▼
  ├─► Deploy Staging (kubectl apply no EKS)
  │     │
  │     ▼ (aprovacao manual no GitHub)
  └─► Deploy Production
```

#### 2.3. O que criar antes do pipeline funcionar

1. **Testes** — sem testes, o pipeline nao tem o que validar
   - `backend/`: configurar Jest (ja vem com NestJS) + testes unitarios nos use cases
   - `frontend/`: instalar Vitest + React Testing Library
2. **ESLint** — garantir que `npm run lint` funciona nos dois projetos
3. **Dockerfile de producao** — o frontend hoje roda `npm run dev` (Vite dev server); para prod, fazer build estatico + nginx

#### 2.4. Frontend Dockerfile para producao

```dockerfile
# frontend/Dockerfile.prod
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## 3. Kubernetes

### Estado atual

Apenas docker-compose.yml. Nenhum manifesto Kubernetes.

### O que implementar

Criar pasta `k8s/` na raiz do projeto:

```
k8s/
  base/
    namespace.yaml
    backend/
      deployment.yaml
      service.yaml
      hpa.yaml
    frontend/
      deployment.yaml
      service.yaml
    database/
      statefulset.yaml
      service.yaml
      pvc.yaml
    ingress.yaml
    configmap.yaml
    secrets.yaml
  overlays/
    staging/
      kustomization.yaml
      patches/
    production/
      kustomization.yaml
      patches/
```

#### 3.1. Namespace

```yaml
# k8s/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: fpm
  labels:
    app: fpm
```

#### 3.2. Backend Deployment

```yaml
# k8s/base/backend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fpm-backend
  namespace: fpm
  labels:
    app: fpm
    component: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: fpm
      component: backend
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: fpm
        component: backend
    spec:
      initContainers:
        - name: run-migrations
          image: ghcr.io/seu-usuario/fpm/backend:latest
          command: ["npx", "prisma", "migrate", "deploy"]
          envFrom:
            - configMapRef:
                name: fpm-config
            - secretRef:
                name: fpm-secrets
      containers:
        - name: backend
          image: ghcr.io/seu-usuario/fpm/backend:latest
          ports:
            - containerPort: 3001
          envFrom:
            - configMapRef:
                name: fpm-config
            - secretRef:
                name: fpm-secrets
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3001
            initialDelaySeconds: 15
            periodSeconds: 5
```

#### 3.3. Backend Service

```yaml
# k8s/base/backend/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: fpm-backend
  namespace: fpm
spec:
  selector:
    app: fpm
    component: backend
  ports:
    - port: 3001
      targetPort: 3001
  type: ClusterIP
```

#### 3.4. HPA (Horizontal Pod Autoscaler)

```yaml
# k8s/base/backend/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: fpm-backend-hpa
  namespace: fpm
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: fpm-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

#### 3.5. Frontend Deployment + Service

```yaml
# k8s/base/frontend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fpm-frontend
  namespace: fpm
spec:
  replicas: 2
  selector:
    matchLabels:
      app: fpm
      component: frontend
  template:
    metadata:
      labels:
        app: fpm
        component: frontend
    spec:
      containers:
        - name: frontend
          image: ghcr.io/seu-usuario/fpm/frontend:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
          livenessProbe:
            httpGet:
              path: /
              port: 80
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 80
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: fpm-frontend
  namespace: fpm
spec:
  selector:
    app: fpm
    component: frontend
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

#### 3.6. Ingress (NGINX Ingress Controller)

```yaml
# k8s/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: fpm-ingress
  namespace: fpm
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - fpm.seudominio.com.br
        - api.fpm.seudominio.com.br
      secretName: fpm-tls
  rules:
    - host: fpm.seudominio.com.br
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: fpm-frontend
                port:
                  number: 80
    - host: api.fpm.seudominio.com.br
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: fpm-backend
                port:
                  number: 3001
```

#### 3.7. ConfigMap e Secrets

```yaml
# k8s/base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fpm-config
  namespace: fpm
data:
  PORT: "3001"
  JWT_EXPIRES_IN: "15m"
  NODE_ENV: "production"
---
# k8s/base/secrets.yaml (em prod, usar External Secrets ou Sealed Secrets)
apiVersion: v1
kind: Secret
metadata:
  name: fpm-secrets
  namespace: fpm
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@fpm-database:5432/fpm_db"
  JWT_SECRET: "trocar-em-producao"
  JWT_REFRESH_SECRET: "trocar-em-producao"
```

#### 3.8. Kustomize para ambientes

```yaml
# k8s/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: fpm-staging
resources:
  - ../../base
patches:
  - patch: |-
      - op: replace
        path: /spec/replicas
        value: 1
    target:
      kind: Deployment

# k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: fpm-production
resources:
  - ../../base
patches:
  - patch: |-
      - op: replace
        path: /spec/replicas
        value: 3
    target:
      kind: Deployment
```

---

## 4. AWS — Infraestrutura Cloud

### Arquitetura proposta na AWS

```
                    ┌──────────────┐
                    │   Route 53   │
                    │  DNS         │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   CloudFront │
                    │   (CDN)      │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │     ALB      │
                    │ (Load Bal.)  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │  EKS Node │ │  EKS  │ │  EKS Node │
        │  Group 1  │ │ Node 2│ │  Group 3  │
        │           │ │       │ │           │
        │ Backend   │ │Backend│ │ Frontend  │
        │ Frontend  │ │Front. │ │ Backend   │
        └───────────┘ └───────┘ └───────────┘
                           │
                    ┌──────▼───────┐
                    │   RDS        │
                    │ PostgreSQL   │
                    │ Multi-AZ     │
                    └──────────────┘
                           │
                    ┌──────▼───────┐
                    │   S3         │
                    │ Backups/Logs │
                    └──────────────┘
```

### 4.1. Servicos AWS e por que usar cada um

| Servico       | Substitui            | Por que                                          |
|---------------|----------------------|--------------------------------------------------|
| **EKS**       | docker-compose       | Kubernetes gerenciado, escala automatica          |
| **RDS**       | container PostgreSQL  | Backup automatico, Multi-AZ, patches gerenciados |
| **ECR**       | GHCR                 | Registry privado integrado ao EKS                |
| **ALB**       | nada (porta direta)  | Load balancing, SSL termination, health checks   |
| **Route 53**  | nada                 | DNS gerenciado                                   |
| **CloudFront**| nada                 | CDN para frontend estatico (latencia baixa)      |
| **S3**        | volume local         | Backups, logs, assets estaticos                   |
| **Secrets Manager** | .env            | Secrets rotacionados, integrado ao EKS           |
| **CloudWatch**| Winston em arquivo   | Logs centralizados, alertas, metricas            |

### 4.2. Terraform — Infraestrutura como Codigo

Criar pasta `infra/terraform/`:

```
infra/
  terraform/
    main.tf
    variables.tf
    outputs.tf
    modules/
      vpc/
        main.tf
        variables.tf
        outputs.tf
      eks/
        main.tf
        variables.tf
        outputs.tf
      rds/
        main.tf
        variables.tf
        outputs.tf
    environments/
      staging/
        terraform.tfvars
      production/
        terraform.tfvars
```

#### VPC (rede isolada)

```hcl
# infra/terraform/modules/vpc/main.tf
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "fpm-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true  # economia em staging

  tags = {
    Project     = "fpm"
    Environment = var.environment
  }
}
```

#### EKS (Kubernetes gerenciado)

```hcl
# infra/terraform/modules/eks/main.tf
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "fpm-cluster"
  cluster_version = "1.29"

  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnet_ids

  eks_managed_node_groups = {
    default = {
      instance_types = ["t3.medium"]
      min_size       = 2
      max_size       = 5
      desired_size   = 2
    }
  }

  cluster_addons = {
    coredns    = { most_recent = true }
    kube-proxy = { most_recent = true }
    vpc-cni    = { most_recent = true }
  }
}
```

#### RDS (banco de dados gerenciado)

```hcl
# infra/terraform/modules/rds/main.tf
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "fpm-database"

  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.t3.micro"  # staging; db.t3.medium para prod

  allocated_storage     = 20
  max_allocated_storage = 100

  db_name  = "fpm_db"
  username = "fpm_admin"
  port     = 5432

  multi_az               = var.environment == "production"
  backup_retention_period = 7
  deletion_protection     = var.environment == "production"

  vpc_security_group_ids = [var.db_security_group_id]
  db_subnet_group_name   = var.db_subnet_group_name
}
```

### 4.3. Estimativa de custo AWS (staging)

| Servico          | Especificacao          | Custo estimado/mes |
|------------------|------------------------|--------------------|
| EKS              | Cluster + 2x t3.medium | ~$150              |
| RDS              | db.t3.micro, single-AZ | ~$15               |
| ALB              | 1 load balancer        | ~$25               |
| ECR              | Storage de imagens     | ~$5                |
| Route 53         | 1 hosted zone          | ~$1                |
| **Total staging**|                        | **~$196/mes**      |

Para **reducao de custo em aprendizado**, considere:
- Usar **k3s** ou **minikube** localmente antes de subir no EKS
- Usar **LocalStack** para simular servicos AWS gratuitamente
- Aproveitar o **Free Tier** da AWS (12 meses)

---

## 5. Ordem de execucao recomendada

### Fase 1 — Fundacao (semanas 1-2)

```
[ ] 1. Escrever testes unitarios para os services do backend
[ ] 2. Escrever testes no frontend (Dashboard, forms)
[ ] 3. Configurar ESLint em ambos os projetos
[ ] 4. Criar GitHub Actions basico (lint + test)
[ ] 5. Criar Dockerfile de producao para o frontend (nginx)
```

**Por que primeiro:** Sem testes, CI/CD nao tem valor. Sem CI/CD, deploys sao arriscados.

### Fase 2 — DDD (semanas 3-4)

```
[ ] 6. Refatorar Equipment: entidade de dominio + repositorio
[ ] 7. Refatorar Maintenance: entidade de dominio + repositorio
[ ] 8. Implementar Domain Events (equipment-created → auto-schedule)
[ ] 9. Instalar @nestjs/cqrs para event bus
[ ] 10. Criar Use Cases separados dos controllers
```

**Por que segundo:** Com testes ja rodando no CI, voce refatora com seguranca.

### Fase 3 — Kubernetes (semanas 5-6)

```
[ ] 11. Criar manifestos base (deployment, service, ingress)
[ ] 12. Configurar ConfigMap e Secrets
[ ] 13. Testar localmente com minikube ou k3s
[ ] 14. Configurar HPA
[ ] 15. Usar Kustomize para staging vs production
```

**Por que terceiro:** A aplicacao ja esta testada e bem estruturada.

### Fase 4 — AWS (semanas 7-8)

```
[ ] 16. Criar modulos Terraform (VPC, EKS, RDS)
[ ] 17. Provisionar ambiente staging na AWS
[ ] 18. Configurar ECR e push de imagens
[ ] 19. Deploy no EKS via CI/CD
[ ] 20. Configurar ALB + Route 53 + certificado SSL
[ ] 21. Provisionar ambiente production
```

**Por que por ultimo:** Precisa de tudo anterior funcionando para o deploy fazer sentido.

### Mapa visual

```
Testes + CI/CD (fundacao)
        │
        ▼
DDD (refatorar com seguranca)
        │
        ▼
Kubernetes (orquestrar containers)
        │
        ▼
AWS (infraestrutura cloud)
```

---

## Recursos para estudo

| Tema        | Recurso                                                     |
|-------------|-------------------------------------------------------------|
| DDD + NestJS | github.com/nestjs/cqrs — modulo oficial de CQRS/Events    |
| Kubernetes   | kubernetes.io/docs/tutorials — tutoriais oficiais          |
| k3s local    | k3s.io — Kubernetes leve para testes locais                |
| Terraform    | developer.hashicorp.com/terraform/tutorials                |
| EKS          | docs.aws.amazon.com/eks/latest/userguide                   |
| GitHub Actions | docs.github.com/en/actions                               |
| LocalStack   | localstack.cloud — simula AWS localmente                   |

---

*Documento gerado em 2026-03-20.*
*Projeto: FPM — Factory Preventive Maintenance*
