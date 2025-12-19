---
tags: [planning, crud, use-cases, api-routes, critical]
priority: critical
created: 2025-12-18
updated: 2025-12-18
version: 2.1
epic: 02-crud-core
target-agent: sonnet-4.5
estimated-time: 16-24 hours
phases: 7
total-tasks: 35
---

# 🏗️ Feature Spec: CRUD Core - Base Operations

> **Objetivo**: Implementar CRUD completo para a hierarquia Organization → Project → Epic → Feature → Task.
> 
> **Pré-requisitos**: 
> - Database criado via [IMPLEMENTATION-SPEC.md](../database/IMPLEMENTATION-SPEC.md)
> - Setup completo via [FEATURE-project-setup.md](./FEATURE-project-setup.md)

---

## 📋 Contexto

### Hierarquia de Entidades (Rígida)

```
Organization (Tenant) ← RLS via org_id
  └── Project ← key (APP, SDK) + modules array
      └── Epic ← OPEN/CLOSED
          └── Feature ← BACKLOG/TODO/DOING/DONE
              └── Task ← local_id sequencial (APP-1, APP-2...)
                  ├── Comment
                  └── PokerSession
```

### Stack de Arquitetura

```
API Route (Controller)
  ↓ chama
Use Case (Business Logic)
  ↓ usa
Adapter/Repository (Supabase)
```

### Regras de Ouro - CRUD

1. **SEMPRE filtrar por org_id** - Isolamento multi-tenant
2. **SEMPRE usar `extractAuthenticatedTenant`** em rotas protegidas
3. **EVITAR N+1** - Usar `include` com `select` do Prisma
4. **Validar entrada** - Zod schema ANTES de chamar use case
5. **Retornar tipos específicos** - Não vazar fields internos
6. **Cache curto** - `cacheHeaders('short')` para listas
7. **Logs estruturados** - Sempre logar org_id e user_id em mutations
8. **Project.key é IMUTÁVEL** - Não permitir update (quebra readable IDs)
9. **PATCH vazio = 400** - Validar que body tem pelo menos 1 campo
10. **Pagination sempre retorna total** - Para UI de "Página 1 de N"

---

## 🚨 Anti-Patterns CRÍTICOS

### ❌ N+1 Query Problem

```typescript
// ❌ ERRADO - 1 query + N queries (loop)
const tasks = await prisma.task.findMany({ where: { orgId } });
for (const task of tasks) {
  const feature = await prisma.feature.findUnique({ where: { id: task.featureId } });
}
```

### ✅ Solução Correta

```typescript
// ✅ CERTO - 1 query única
const tasks = await prisma.task.findMany({
  where: { orgId },
  include: {
    feature: {
      select: { id: true, title: true }
    }
  }
});
```

### ❌ Data Leak entre Tenants

```typescript
// ❌ ERRADO - sem filtro org_id
const projects = await prisma.project.findMany(); // Vaza dados!
```

### ✅ Solução Correta

```typescript
// ✅ CERTO - sempre filtrar por org_id
const { tenantId } = await extractAuthenticatedTenant(supabase);
const projects = await prisma.project.findMany({
  where: { orgId: tenantId }
});
```

---

## 📁 Estrutura de Arquivos a Criar

```
src/
├── domain/
│   └── use-cases/
│       ├── projects/
│       │   ├── create-project.ts
│       │   ├── get-projects.ts
│       │   ├── get-project-by-id.ts
│       │   ├── update-project.ts
│       │   └── delete-project.ts
│       │
│       ├── epics/
│       │   ├── create-epic.ts
│       │   ├── get-epics.ts
│       │   ├── get-epic-by-id.ts
│       │   ├── update-epic.ts
│       │   └── delete-epic.ts
│       │
│       ├── features/
│       │   ├── create-feature.ts
│       │   ├── get-features.ts
│       │   ├── update-feature.ts
│       │   └── delete-feature.ts
│       │
│       └── tasks/
│           ├── create-task.ts
│           ├── get-tasks.ts
│           ├── get-task-by-id.ts
│           ├── update-task.ts
│           ├── delete-task.ts
│           └── update-task-status.ts
│
├── infra/
│   └── adapters/
│       └── prisma/
│           ├── project.repository.ts
│           ├── epic.repository.ts
│           ├── feature.repository.ts
│           └── task.repository.ts
│
└── app/
    └── api/
        ├── projects/
        │   ├── route.ts              # GET /api/projects, POST /api/projects
        │   └── [id]/
        │       ├── route.ts          # GET, PATCH, DELETE /api/projects/:id
        │       └── epics/
        │           └── route.ts      # GET, POST /api/projects/:id/epics
        │
        ├── epics/
        │   └── [id]/
        │       ├── route.ts          # GET, PATCH, DELETE /api/epics/:id
        │       └── features/
        │           └── route.ts      # GET, POST /api/epics/:id/features
        │
        ├── features/
        │   └── [id]/
        │       ├── route.ts          # GET, PATCH, DELETE /api/features/:id
        │       └── tasks/
        │           └── route.ts      # GET, POST /api/features/:id/tasks
        │
        └── tasks/
            ├── route.ts              # GET /api/tasks (search)
            └── [id]/
                ├── route.ts          # GET, PATCH, DELETE /api/tasks/:id
                └── status/
                    └── route.ts      # PATCH /api/tasks/:id/status
```

---

## 🔢 Fases de Implementação

---

## Fase 1: Repositories (Adapters Layer) - 5 tasks

> **Objetivo**: Criar camada de acesso a dados com Prisma, evitando N+1.
> **Dependências**: Prisma Client gerado

### Task 1.1: Criar Project Repository

**Arquivo**: `src/infra/adapters/prisma/project.repository.ts`

**Conteúdo**:
```typescript
import { PrismaClient } from '@prisma/client';
import type { Project } from '@/shared/types';

export interface CreateProjectInput {
  orgId: string;
  name: string;
  key: string;
  description?: string | null;
  modules?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  // ⚠️ key é IMUTÁVEL após criação - não incluído
  description?: string | null;
  modules?: string[];
}

export class ProjectRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create project
   * @throws ConflictError if key already exists in org
   */
  async create(input: CreateProjectInput): Promise<Project> {
    return await this.prisma.project.create({
      data: {
        orgId: input.orgId,
        name: input.name,
        key: input.key.toUpperCase(), // Always uppercase
        description: input.description,
        modules: input.modules ?? [],
      },
    });
  }

  /**
   * Find all projects in org with epic/task counts
   * NO N+1: Single query with aggregations
   */
  async findMany(orgId: string): Promise<Array<Project & { _count: { epics: number; tasks: number } }>> {
    return await this.prisma.project.findMany({
      where: { orgId },
      include: {
        _count: {
          select: { epics: true, tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find project by ID with org isolation
   * @returns Project or null
   */
  async findById(id: string, orgId: string): Promise<Project | null> {
    return await this.prisma.project.findFirst({
      where: { id, orgId }, // Tenant isolation
    });
  }

  /**
   * Find project by key (unique per org)
   */
  async findByKey(key: string, orgId: string): Promise<Project | null> {
    return await this.prisma.project.findFirst({
      where: { 
        key: key.toUpperCase(),
        orgId 
      },
    });
  }

  /**
   * Update project
   * ⚠️ key é IMUTÁVEL - não pode ser alterado
   * @throws NotFoundError if not found
   */
  async update(
    id: string,
    orgId: string,
    input: UpdateProjectInput
  ): Promise<Project> {
    return await this.prisma.project.update({
      where: { id },
      data: input,
    });
  }

  /**
   * Delete project (cascade deletes epics, features, tasks)
   */
  async delete(id: string, orgId: string): Promise<void> {
    await this.prisma.project.delete({
      where: { id },
    });
  }

  /**
   * Count projects in org
   */
  async count(orgId: string): Promise<number> {
    return await this.prisma.project.count({
      where: { orgId },
    });
  }
}
```

**Validação**:
```bash
npm run typecheck
# Esperado: 0 erros no arquivo
```

---

### Task 1.2: Criar Epic Repository

**Arquivo**: `src/infra/adapters/prisma/epic.repository.ts`

**Conteúdo**:
```typescript
import { PrismaClient } from '@prisma/client';
import type { Epic, EpicStatus } from '@/shared/types';

export interface CreateEpicInput {
  orgId: string;
  projectId: string;
  title: string;
  description?: string | null;
}

export interface UpdateEpicInput {
  title?: string;
  description?: string | null;
  status?: EpicStatus;
}

export class EpicRepository {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateEpicInput): Promise<Epic> {
    return await this.prisma.epic.create({
      data: input,
    });
  }

  /**
   * Find all epics in project
   * NO N+1: Include project data in single query
   */
  async findMany(projectId: string, orgId: string): Promise<Epic[]> {
    return await this.prisma.epic.findMany({
      where: { projectId, orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find epic by ID with relations (for detail view)
   */
  async findById(id: string, orgId: string): Promise<Epic | null> {
    return await this.prisma.epic.findFirst({
      where: { id, orgId },
    });
  }

  /**
   * Find epic with features count (for list view)
   */
  async findManyWithStats(
    projectId: string,
    orgId: string
  ): Promise<Array<Epic & { _count: { features: number } }>> {
    return await this.prisma.epic.findMany({
      where: { projectId, orgId },
      include: {
        _count: {
          select: { features: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    orgId: string,
    input: UpdateEpicInput
  ): Promise<Epic> {
    return await this.prisma.epic.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.prisma.epic.delete({
      where: { id },
    });
  }
}
```

**Validação**:
```bash
npm run typecheck
```

---

### Task 1.3: Criar Feature Repository

**Arquivo**: `src/infra/adapters/prisma/feature.repository.ts`

**Conteúdo**:
```typescript
import { PrismaClient } from '@prisma/client';
import type { Feature, FeatureStatus } from '@/shared/types';

export interface CreateFeatureInput {
  orgId: string;
  epicId: string;
  title: string;
  description?: string | null;
}

export interface UpdateFeatureInput {
  title?: string;
  description?: string | null;
  status?: FeatureStatus;
}

export class FeatureRepository {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateFeatureInput): Promise<Feature> {
    return await this.prisma.feature.create({
      data: input,
    });
  }

  /**
   * Find features with task counts
   * NO N+1: Aggregate in single query
   */
  async findManyWithStats(
    epicId: string,
    orgId: string
  ): Promise<Array<Feature & { _count: { tasks: number } }>> {
    return await this.prisma.feature.findMany({
      where: { epicId, orgId },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, orgId: string): Promise<Feature | null> {
    return await this.prisma.feature.findFirst({
      where: { id, orgId },
    });
  }

  /**
   * Find feature with full breadcrumb (epic → project)
   */
  async findByIdWithBreadcrumb(
    id: string,
    orgId: string
  ): Promise<(Feature & { epic: { id: string; title: string; projectId: string } }) | null> {
    return await this.prisma.feature.findFirst({
      where: { id, orgId },
      include: {
        epic: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    orgId: string,
    input: UpdateFeatureInput
  ): Promise<Feature> {
    return await this.prisma.feature.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.prisma.feature.delete({
      where: { id },
    });
  }
}
```

**Validação**:
```bash
npm run typecheck
```

---

### Task 1.4: Criar Task Repository

**Arquivo**: `src/infra/adapters/prisma/task.repository.ts`

**Conteúdo**:
```typescript
import { PrismaClient } from '@prisma/client';
import type { 
  Task, 
  TaskWithReadableId, 
  TaskStatus, 
  TaskType, 
  TaskPriority,
  StoryPoints,
  TaskFilterParams 
} from '@/shared/types';
import { buildReadableId } from '@/shared/types/task.types';
import { ValidationError } from '@/shared/utils/errors';

export interface CreateTaskInput {
  orgId: string;
  featureId: string;
  title: string;
  description?: string | null;
  type?: TaskType;
  priority?: TaskPriority;
  points?: StoryPoints;
  module?: string | null;
  assigneeId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
  points?: StoryPoints;
  module?: string | null;
  assigneeId?: string | null;
}

export class TaskRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create task with auto-generated local_id
   * Trigger set_task_local_id() handles local_id generation
   */
  async create(input: CreateTaskInput): Promise<Task> {
    // local_id and project_id are auto-filled by DB triggers
    return await this.prisma.task.create({
      data: {
        orgId: input.orgId,
        featureId: input.featureId,
        title: input.title,
        description: input.description,
        type: input.type ?? 'TASK',
        priority: input.priority ?? 'MEDIUM',
        points: input.points,
        module: input.module,
        assigneeId: input.assigneeId,
      },
    });
  }

  /**
   * Find tasks with filters (search, pagination, sort)
   * NO N+1: Include feature, assignee in single query
   */
  async findMany(
    orgId: string,
    filters: TaskFilterParams = {}
  ): Promise<TaskWithReadableId[]> {
    const {
      status,
      type,
      priority,
      assigneeId,
      module,
      featureId,
      epicId,
      search,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: any = { orgId };

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status;
    }
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (module) where.module = module;
    if (featureId) where.featureId = featureId;
    if (search) {
      // Escape caracteres especiais do LIKE (%, _) para evitar wildcard injection
      const escapedSearch = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
      where.OR = [
        { title: { contains: escapedSearch, mode: 'insensitive' } },
        { description: { contains: escapedSearch, mode: 'insensitive' } },
      ];
    }

    // Filter by epic (requires JOIN)
    if (epicId) {
      where.feature = { epicId };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        feature: {
          select: {
            id: true,
            title: true,
            epic: {
              select: {
                id: true,
                title: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                    key: true,
                  },
                },
              },
            },
          },
        },
        // Assignee info (from auth.users via Supabase)
        // Note: Prisma doesn't have access to auth schema
        // This would need to be fetched separately or via Supabase client
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    });

    // Build readable IDs (APP-1, APP-2, etc)
    return tasks.map((task) => ({
      ...task,
      readableId: buildReadableId(
        task.feature.epic.project.key,
        task.localId
      ),
    }));
  }

  /**
   * Find task by readable ID (e.g., "APP-123")
   * @throws ValidationError if format is invalid
   */
  async findByReadableId(
    readableId: string,
    orgId: string
  ): Promise<TaskWithReadableId | null> {
    // Validar formato: KEY-123 (key: 2-10 chars, localId: 1+)
    const match = readableId.toUpperCase().match(/^([A-Z0-9]{2,10})-(\d+)$/);
    if (!match) {
      throw new ValidationError(
        `ID inválido: "${readableId}". Formato esperado: PROJECT-123`
      );
    }

    const [_, projectKey, localIdStr] = match;
    const localId = parseInt(localIdStr, 10);

    // localId deve ser >= 1 (trigger gera a partir de 1)
    if (localId < 1) {
      throw new ValidationError(`ID inválido: localId deve ser >= 1`);
    }

    const task = await this.prisma.task.findFirst({
      where: {
        orgId,
        localId,
        project: {
          key: projectKey.toUpperCase(),
        },
      },
      include: {
        feature: {
          select: {
            id: true,
            title: true,
            epic: {
              select: {
                id: true,
                title: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                    key: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!task) return null;

    return {
      ...task,
      readableId: buildReadableId(
        task.feature.epic.project.key,
        task.localId
      ),
    };
  }

  async findById(id: string, orgId: string): Promise<Task | null> {
    return await this.prisma.task.findFirst({
      where: { id, orgId },
    });
  }

  async update(
    id: string,
    orgId: string,
    input: UpdateTaskInput
  ): Promise<Task> {
    return await this.prisma.task.update({
      where: { id },
      data: input,
    });
  }

  /**
   * Update only status (common operation)
   */
  async updateStatus(
    id: string,
    orgId: string,
    status: TaskStatus
  ): Promise<Task> {
    return await this.prisma.task.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.prisma.task.delete({
      where: { id },
    });
  }

  /**
   * Count tasks by filters
   */
  async count(orgId: string, filters: TaskFilterParams = {}): Promise<number> {
    const { status, type, priority, featureId, epicId } = filters;
    const where: any = { orgId };

    if (status) where.status = Array.isArray(status) ? { in: status } : status;
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (featureId) where.featureId = featureId;
    if (epicId) where.feature = { epicId };

    return await this.prisma.task.count({ where });
  }
}
```

**Validação**:
```bash
npm run typecheck
```

---

### Task 1.5: Criar Repository Index & Prisma Singleton

**Arquivo**: `src/infra/adapters/prisma/index.ts`

**Conteúdo**:
```typescript
import { PrismaClient } from '@prisma/client';
import { ProjectRepository } from './project.repository';
import { EpicRepository } from './epic.repository';
import { FeatureRepository } from './feature.repository';
import { TaskRepository } from './task.repository';

// Singleton Prisma Client
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prismaclient-in-long-running-applications
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Repository instances
export const projectRepository = new ProjectRepository(prisma);
export const epicRepository = new EpicRepository(prisma);
export const featureRepository = new FeatureRepository(prisma);
export const taskRepository = new TaskRepository(prisma);

// Re-export for convenience
export { ProjectRepository, EpicRepository, FeatureRepository, TaskRepository };
```

**Validação**:
```bash
npm run typecheck
npm run build
# Ambos devem passar sem erros
```

---

## Fase 2: Use Cases - Projects (5 tasks)

> **Objetivo**: Criar lógica de negócio para Projects (sem dependência de framework).
> **Dependências**: Fase 1 completa

### Task 2.1: Create Project Use Case

**Arquivo**: `src/domain/use-cases/projects/create-project.ts`

**Conteúdo**:
```typescript
import type { Project } from '@/shared/types';
import type { ProjectRepository } from '@/infra/adapters/prisma';
import { ConflictError, ValidationError } from '@/shared/utils/errors';

export interface CreateProjectInput {
  orgId: string;
  name: string;
  key: string;
  description?: string | null;
  modules?: string[];
}

export interface CreateProjectDeps {
  projectRepository: ProjectRepository;
}

/**
 * Create Project Use Case
 * 
 * Business Rules:
 * - Project key must be unique per organization
 * - Key is always uppercase (2-10 chars)
 * - Modules must be unique strings
 */
export async function createProject(
  input: CreateProjectInput,
  deps: CreateProjectDeps
): Promise<Project> {
  const { projectRepository } = deps;

  // 1. Validate key format
  const keyRegex = /^[A-Z0-9]{2,10}$/;
  if (!keyRegex.test(input.key.toUpperCase())) {
    throw new ValidationError(
      'Key deve ter 2-10 caracteres (apenas letras maiúsculas e números)'
    );
  }

  // 2. Check for duplicate key in org
  const existing = await projectRepository.findByKey(input.key, input.orgId);
  if (existing) {
    throw new ConflictError(`Projeto com key "${input.key}" já existe`);
  }

  // 3. Validate modules are unique
  if (input.modules) {
    const uniqueModules = [...new Set(input.modules)];
    if (uniqueModules.length !== input.modules.length) {
      throw new ValidationError('Módulos duplicados não são permitidos');
    }
  }

  // 4. Create project
  return await projectRepository.create({
    orgId: input.orgId,
    name: input.name,
    key: input.key.toUpperCase(),
    description: input.description,
    modules: input.modules ?? [],
  });
}
```

**Validação**:
```bash
npm run typecheck
```

---

### Task 2.2: Get Projects Use Case

**Arquivo**: `src/domain/use-cases/projects/get-projects.ts`

**Conteúdo**:
```typescript
import type { Project } from '@/shared/types';
import type { ProjectRepository } from '@/infra/adapters/prisma';

export interface GetProjectsDeps {
  projectRepository: ProjectRepository;
}

/**
 * Get Projects Use Case
 * 
 * Returns all projects in organization
 * Ordered by creation date (newest first)
 */
export async function getProjects(
  orgId: string,
  deps: GetProjectsDeps
): Promise<Project[]> {
  const { projectRepository } = deps;

  return await projectRepository.findMany(orgId);
}
```

**Validação**:
```bash
npm run typecheck
```

---

### Task 2.3: Get Project By ID Use Case

**Arquivo**: `src/domain/use-cases/projects/get-project-by-id.ts`

**Conteúdo**:
```typescript
import type { Project } from '@/shared/types';
import type { ProjectRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/utils/errors';

export interface GetProjectByIdDeps {
  projectRepository: ProjectRepository;
}

/**
 * Get Project By ID Use Case
 * 
 * @throws NotFoundError if project not found or not in user's org
 */
export async function getProjectById(
  id: string,
  orgId: string,
  deps: GetProjectByIdDeps
): Promise<Project> {
  const { projectRepository } = deps;

  const project = await projectRepository.findById(id, orgId);

  if (!project) {
    throw new NotFoundError('Projeto', id);
  }

  return project;
}
```

**Validação**:
```bash
npm run typecheck
```

---

### Task 2.4: Update Project Use Case

**Arquivo**: `src/domain/use-cases/projects/update-project.ts`

**Conteúdo**:
```typescript
import type { Project } from '@/shared/types';
import type { ProjectRepository } from '@/infra/adapters/prisma';
import { NotFoundError, ConflictError, ValidationError } from '@/shared/utils/errors';

export interface UpdateProjectInput {
  name?: string;
  // ⚠️ key é IMUTÁVEL - não incluído aqui
  description?: string | null;
  modules?: string[];
}

export interface UpdateProjectDeps {
  projectRepository: ProjectRepository;
}

/**
 * Update Project Use Case
 * 
 * Business Rules:
 * - key é IMUTÁVEL (não pode ser alterado após criação)
 * - Modules must be unique
 */
export async function updateProject(
  id: string,
  orgId: string,
  input: UpdateProjectInput,
  deps: UpdateProjectDeps
): Promise<Project> {
  const { projectRepository } = deps;

  // 1. Check project exists
  const existing = await projectRepository.findById(id, orgId);
  if (!existing) {
    throw new NotFoundError('Projeto', id);
  }

  // 2. Validate modules are unique
  if (input.modules) {
    const uniqueModules = [...new Set(input.modules)];
    if (uniqueModules.length !== input.modules.length) {
      throw new ValidationError('Módulos duplicados não são permitidos');
    }
  }

  // 3. Update
  return await projectRepository.update(id, orgId, input);
}
```

**Validação**:
```bash
npm run typecheck
```

---

### Task 2.5: Delete Project Use Case

**Arquivo**: `src/domain/use-cases/projects/delete-project.ts`

**Conteúdo**:
```typescript
import type { ProjectRepository } from '@/infra/adapters/prisma';
import { NotFoundError, ValidationError } from '@/shared/utils/errors';

export interface DeleteProjectDeps {
  projectRepository: ProjectRepository;
}

/**
 * Delete Project Use Case
 * 
 * ⚠️ CASCADE DELETE:
 * - All epics in project
 * - All features in those epics
 * - All tasks in those features
 * - All comments, poker sessions, etc
 * 
 * This is a DESTRUCTIVE operation.
 */
export async function deleteProject(
  id: string,
  orgId: string,
  deps: DeleteProjectDeps
): Promise<void> {
  const { projectRepository } = deps;

  // 1. Check project exists
  const project = await projectRepository.findById(id, orgId);
  if (!project) {
    throw new NotFoundError('Projeto', id);
  }

  // 2. Future: Check if project has tasks in progress
  // For MVP, allow delete (DB cascade handles cleanup)

  // 3. Delete (cascade)
  await projectRepository.delete(id, orgId);
}
```

**Validação**:
```bash
npm run typecheck
npm run build
```

---

## Fase 3: API Routes - Projects (5 tasks)

> **Objetivo**: Criar endpoints HTTP para Projects (thin controllers).
> **Dependências**: Fase 2 completa

### Task 3.1: POST /api/projects - Create

**Arquivo**: `src/app/api/projects/route.ts`

**Conteúdo**:
```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/utils/errors';
import { projectRepository } from '@/infra/adapters/prisma';
import { createProject } from '@/domain/use-cases/projects/create-project';
import { getProjects } from '@/domain/use-cases/projects/get-projects';
import { z } from 'zod';

// Validation schema
const createProjectSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres'),
  key: z.string().min(2).max(10).regex(/^[A-Z0-9]+$/i, 'Apenas letras e números'),
  description: z.string().max(1000).nullable().optional(),
  modules: z.array(z.string().min(1).max(50)).max(20).optional(),
});

/**
 * POST /api/projects
 * Create new project
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // 2. Parse & validate body
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    // 3. Call use case
    const project = await createProject(
      {
        orgId: tenantId,
        ...parsed.data,
      },
      { projectRepository }
    );

    // 4. Return created project
    return jsonSuccess(project, { status: 201 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status, body.error.details);
  }
}

/**
 * GET /api/projects
 * List all projects in organization
 */
export async function GET() {
  try {
    // 1. Auth
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // 2. Call use case
    const projects = await getProjects(tenantId, { projectRepository });

    // 3. Return with short cache (1 min)
    return jsonSuccess(projects, { cache: 'short' });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
```

**Validação**:
```bash
npm run typecheck
npm run build
```

---

### Task 3.2: GET /api/projects/[id] - Read One

**Arquivo**: `src/app/api/projects/[id]/route.ts`

**Conteúdo**:
```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/utils/errors';
import { projectRepository } from '@/infra/adapters/prisma';
import { getProjectById } from '@/domain/use-cases/projects/get-project-by-id';
import { updateProject } from '@/domain/use-cases/projects/update-project';
import { deleteProject } from '@/domain/use-cases/projects/delete-project';
import { z } from 'zod';

const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  // ⚠️ key é IMUTÁVEL - não pode ser alterado após criação (quebraria readable IDs)
  description: z.string().max(1000).nullable().optional(),
  modules: z.array(z.string().min(1).max(50)).max(20).optional(),
});

/**
 * GET /api/projects/:id
 * Get project by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Auth
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // 2. Call use case
    const project = await getProjectById(id, tenantId, { projectRepository });

    // 3. Return with short cache
    return jsonSuccess(project, { cache: 'short' });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * PATCH /api/projects/:id
 * Update project
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Auth
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // 2. Parse & validate
    const body = await request.json();
    
    // 2.1 Verificar body não vazio
    if (!body || Object.keys(body).length === 0) {
      return jsonError('VALIDATION_ERROR', 'Nenhum campo fornecido para atualizar', 400);
    }
    
    const parsed = updateProjectSchema.safeParse(body);
    
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    // 3. Call use case
    const project = await updateProject(
      id,
      tenantId,
      parsed.data,
      { projectRepository }
    );

    // 4. Return updated project
    return jsonSuccess(project);

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status, body.error.details);
  }
}

/**
 * DELETE /api/projects/:id
 * Delete project (cascade)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Auth
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // 2. Call use case
    await deleteProject(id, tenantId, { projectRepository });

    // 3. Return 204 No Content
    return new Response(null, { status: 204 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
```

**Validação**:
```bash
npm run typecheck
```

---

### Task 3.3: GET /api/projects/[id]/epics - List Epics

**Arquivo**: `src/app/api/projects/[id]/epics/route.ts`

**Conteúdo**:
```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/utils/errors';
import { projectRepository, epicRepository } from '@/infra/adapters/prisma';
import { getProjectById } from '@/domain/use-cases/projects/get-project-by-id';
import { getEpics } from '@/domain/use-cases/epics/get-epics';
import { createEpic } from '@/domain/use-cases/epics/create-epic';
import { z } from 'zod';

const createEpicSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres').max(200, 'Máximo 200 caracteres'),
  description: z.string().max(5000).nullable().optional(),
});

/**
 * GET /api/projects/:id/epics
 * List epics in project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // 1. Auth
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // 2. Verify project exists and belongs to org
    await getProjectById(projectId, tenantId, { projectRepository });

    // 3. Get epics
    const epics = await getEpics(projectId, tenantId, { epicRepository });

    // 4. Return with short cache
    return jsonSuccess(epics, { cache: 'short' });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * POST /api/projects/:id/epics
 * Create epic in project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // 1. Auth
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // 2. Verify project exists
    await getProjectById(projectId, tenantId, { projectRepository });

    // 3. Parse & validate
    const body = await request.json();
    const parsed = createEpicSchema.safeParse(body);
    
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    // 4. Create epic
    const epic = await createEpic(
      {
        orgId: tenantId,
        projectId,
        ...parsed.data,
      },
      { epicRepository }
    );

    // 5. Return created
    return jsonSuccess(epic, { status: 201 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status, body.error.details);
  }
}
```

**Validação**:
```bash
npm run typecheck
```

---

### Task 3.4: Criar Use Cases de Epic (stub para próxima fase)

**Arquivo**: `src/domain/use-cases/epics/get-epics.ts`

**Conteúdo**:
```typescript
import type { Epic } from '@/shared/types';
import type { EpicRepository } from '@/infra/adapters/prisma';

export interface GetEpicsDeps {
  epicRepository: EpicRepository;
}

export async function getEpics(
  projectId: string,
  orgId: string,
  deps: GetEpicsDeps
): Promise<Epic[]> {
  const { epicRepository } = deps;
  return await epicRepository.findManyWithStats(projectId, orgId);
}
```

**Arquivo**: `src/domain/use-cases/epics/create-epic.ts`

**Conteúdo**:
```typescript
import type { Epic } from '@/shared/types';
import type { EpicRepository } from '@/infra/adapters/prisma';

export interface CreateEpicInput {
  orgId: string;
  projectId: string;
  title: string;
  description?: string | null;
}

export interface CreateEpicDeps {
  epicRepository: EpicRepository;
}

export async function createEpic(
  input: CreateEpicInput,
  deps: CreateEpicDeps
): Promise<Epic> {
  const { epicRepository } = deps;
  return await epicRepository.create(input);
}
```

**Validação**:
```bash
npm run typecheck
```

---

### Task 3.5: Validar Fase 3 Completa

**Testes manuais**:

1. **Start dev server**:
```bash
npm run dev
```

2. **Test POST /api/projects** (criar projeto):
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "key": "TEST",
    "description": "Test description",
    "modules": ["Backend", "Frontend"]
  }'

# Esperado: 401 Unauthorized (sem auth ainda)
# Isso é CORRETO - auth será implementado no Epic 01
```

3. **Verificar build**:
```bash
npm run build
# Esperado: Build completo sem erros
```

**Checklist Fase 3**:
- [ ] 3 arquivos de rotas criados
- [ ] `npm run typecheck` passa
- [ ] `npm run build` passa
- [ ] Rotas retornam 401 sem auth (esperado)

---

## Fase 4: Use Cases & Routes - Epics (5 tasks)

> **Objetivo**: CRUD completo para Epics
> **Dependências**: Fases 1-3 completas

### Task 4.1: Use Cases de Epic (complete)

**Arquivo**: `src/domain/use-cases/epics/get-epic-by-id.ts`

```typescript
import type { Epic } from '@/shared/types';
import type { EpicRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/utils/errors';

export interface GetEpicByIdDeps {
  epicRepository: EpicRepository;
}

export async function getEpicById(
  id: string,
  orgId: string,
  deps: GetEpicByIdDeps
): Promise<Epic> {
  const { epicRepository } = deps;

  const epic = await epicRepository.findById(id, orgId);

  if (!epic) {
    throw new NotFoundError('Epic', id);
  }

  return epic;
}
```

**Arquivo**: `src/domain/use-cases/epics/update-epic.ts`

```typescript
import type { Epic, EpicStatus } from '@/shared/types';
import type { EpicRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/utils/errors';

export interface UpdateEpicInput {
  title?: string;
  description?: string | null;
  status?: EpicStatus;
}

export interface UpdateEpicDeps {
  epicRepository: EpicRepository;
}

export async function updateEpic(
  id: string,
  orgId: string,
  input: UpdateEpicInput,
  deps: UpdateEpicDeps
): Promise<Epic> {
  const { epicRepository } = deps;

  // 1. Check epic exists
  const existing = await epicRepository.findById(id, orgId);
  if (!existing) {
    throw new NotFoundError('Epic', id);
  }

  // 2. Update
  return await epicRepository.update(id, orgId, input);
}
```

**Arquivo**: `src/domain/use-cases/epics/delete-epic.ts`

```typescript
import type { EpicRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/utils/errors';

export interface DeleteEpicDeps {
  epicRepository: EpicRepository;
}

/**
 * Delete Epic Use Case
 * 
 * ⚠️ CASCADE DELETE: Features e Tasks dentro do Epic serão deletados
 */
export async function deleteEpic(
  id: string,
  orgId: string,
  deps: DeleteEpicDeps
): Promise<void> {
  const { epicRepository } = deps;

  const epic = await epicRepository.findById(id, orgId);
  if (!epic) {
    throw new NotFoundError('Epic', id);
  }

  await epicRepository.delete(id, orgId);
}
```

---

### Task 4.2: API Routes - Epic Detail

**Arquivo**: `src/app/api/epics/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/utils/errors';
import { epicRepository } from '@/infra/adapters/prisma';
import { getEpicById } from '@/domain/use-cases/epics/get-epic-by-id';
import { updateEpic } from '@/domain/use-cases/epics/update-epic';
import { deleteEpic } from '@/domain/use-cases/epics/delete-epic';
import { z } from 'zod';

const updateEpicSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
});

/**
 * GET /api/epics/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const epic = await getEpicById(id, tenantId, { epicRepository });
    return jsonSuccess(epic, { cache: 'short' });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * PATCH /api/epics/:id
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const body = await request.json();
    
    // Validar body não vazio
    if (!body || Object.keys(body).length === 0) {
      return jsonError('VALIDATION_ERROR', 'Nenhum campo fornecido para atualizar', 400);
    }

    const parsed = updateEpicSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const epic = await updateEpic(id, tenantId, parsed.data, { epicRepository });
    return jsonSuccess(epic);
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status, body.error.details);
  }
}

/**
 * DELETE /api/epics/:id
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    await deleteEpic(id, tenantId, { epicRepository });
    return new Response(null, { status: 204 });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
```

---

### Task 4.3: API Routes - Epic Features

**Arquivo**: `src/app/api/epics/[id]/features/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/utils/errors';
import { epicRepository, featureRepository } from '@/infra/adapters/prisma';
import { getEpicById } from '@/domain/use-cases/epics/get-epic-by-id';
import { getFeatures } from '@/domain/use-cases/features/get-features';
import { createFeature } from '@/domain/use-cases/features/create-feature';
import { z } from 'zod';

const createFeatureSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres').max(200, 'Máximo 200 caracteres'),
  description: z.string().max(5000).nullable().optional(),
});

/**
 * GET /api/epics/:id/features
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: epicId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // Verificar que epic existe e pertence à org
    await getEpicById(epicId, tenantId, { epicRepository });

    const features = await getFeatures(epicId, tenantId, { featureRepository });
    return jsonSuccess(features, { cache: 'short' });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * POST /api/epics/:id/features
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: epicId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // Verificar que epic existe
    await getEpicById(epicId, tenantId, { epicRepository });

    const body = await request.json();
    const parsed = createFeatureSchema.safeParse(body);
    
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const feature = await createFeature(
      { orgId: tenantId, epicId, ...parsed.data },
      { featureRepository }
    );

    return jsonSuccess(feature, { status: 201 });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status, body.error.details);
  }
}
```

---

### Task 4.4: Use Cases de Feature

**Arquivo**: `src/domain/use-cases/features/get-features.ts`

```typescript
import type { Feature } from '@/shared/types';
import type { FeatureRepository } from '@/infra/adapters/prisma';

export interface GetFeaturesDeps {
  featureRepository: FeatureRepository;
}

export async function getFeatures(
  epicId: string,
  orgId: string,
  deps: GetFeaturesDeps
): Promise<Array<Feature & { _count: { tasks: number } }>> {
  const { featureRepository } = deps;
  return await featureRepository.findManyWithStats(epicId, orgId);
}
```

**Arquivo**: `src/domain/use-cases/features/create-feature.ts`

```typescript
import type { Feature } from '@/shared/types';
import type { FeatureRepository } from '@/infra/adapters/prisma';

export interface CreateFeatureInput {
  orgId: string;
  epicId: string;
  title: string;
  description?: string | null;
}

export interface CreateFeatureDeps {
  featureRepository: FeatureRepository;
}

export async function createFeature(
  input: CreateFeatureInput,
  deps: CreateFeatureDeps
): Promise<Feature> {
  const { featureRepository } = deps;
  return await featureRepository.create(input);
}
```

---

### Task 4.5: Validar Fase 4

```bash
npm run typecheck
npm run build
# Ambos devem passar sem erros
```

**Checklist**:
- [ ] Use cases de Epic completos (get, update, delete)
- [ ] API routes de Epic (/api/epics/[id])
- [ ] API routes de Features nested (/api/epics/[id]/features)
- [ ] Validação de body vazio em PATCH

---

## Fase 5: Use Cases & Routes - Features (5 tasks)

### Task 5.1: Use Cases de Feature (complete)

**Arquivo**: `src/domain/use-cases/features/get-feature-by-id.ts`

```typescript
import type { Feature } from '@/shared/types';
import type { FeatureRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/utils/errors';

export interface GetFeatureByIdDeps {
  featureRepository: FeatureRepository;
}

export async function getFeatureById(
  id: string,
  orgId: string,
  deps: GetFeatureByIdDeps
): Promise<Feature> {
  const { featureRepository } = deps;

  const feature = await featureRepository.findById(id, orgId);

  if (!feature) {
    throw new NotFoundError('Feature', id);
  }

  return feature;
}
```

**Arquivo**: `src/domain/use-cases/features/update-feature.ts`

```typescript
import type { Feature, FeatureStatus } from '@/shared/types';
import type { FeatureRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/utils/errors';

export interface UpdateFeatureInput {
  title?: string;
  description?: string | null;
  status?: FeatureStatus;
}

export interface UpdateFeatureDeps {
  featureRepository: FeatureRepository;
}

export async function updateFeature(
  id: string,
  orgId: string,
  input: UpdateFeatureInput,
  deps: UpdateFeatureDeps
): Promise<Feature> {
  const { featureRepository } = deps;

  const existing = await featureRepository.findById(id, orgId);
  if (!existing) {
    throw new NotFoundError('Feature', id);
  }

  return await featureRepository.update(id, orgId, input);
}
```

**Arquivo**: `src/domain/use-cases/features/delete-feature.ts`

```typescript
import type { FeatureRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/utils/errors';

export interface DeleteFeatureDeps {
  featureRepository: FeatureRepository;
}

/**
 * ⚠️ CASCADE: Tasks dentro da Feature serão deletadas
 */
export async function deleteFeature(
  id: string,
  orgId: string,
  deps: DeleteFeatureDeps
): Promise<void> {
  const { featureRepository } = deps;

  const feature = await featureRepository.findById(id, orgId);
  if (!feature) {
    throw new NotFoundError('Feature', id);
  }

  await featureRepository.delete(id, orgId);
}
```

---

### Task 5.2: API Routes - Feature Detail

**Arquivo**: `src/app/api/features/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/utils/errors';
import { featureRepository } from '@/infra/adapters/prisma';
import { getFeatureById } from '@/domain/use-cases/features/get-feature-by-id';
import { updateFeature } from '@/domain/use-cases/features/update-feature';
import { deleteFeature } from '@/domain/use-cases/features/delete-feature';
import { z } from 'zod';

const updateFeatureSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(['BACKLOG', 'TODO', 'DOING', 'DONE']).optional(),
});

/**
 * GET /api/features/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const feature = await getFeatureById(id, tenantId, { featureRepository });
    return jsonSuccess(feature, { cache: 'short' });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * PATCH /api/features/:id
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const body = await request.json();
    
    if (!body || Object.keys(body).length === 0) {
      return jsonError('VALIDATION_ERROR', 'Nenhum campo fornecido para atualizar', 400);
    }

    const parsed = updateFeatureSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const feature = await updateFeature(id, tenantId, parsed.data, { featureRepository });
    return jsonSuccess(feature);
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status, body.error.details);
  }
}

/**
 * DELETE /api/features/:id
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    await deleteFeature(id, tenantId, { featureRepository });
    return new Response(null, { status: 204 });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
```

---

### Task 5.3: API Routes - Feature Tasks

**Arquivo**: `src/app/api/features/[id]/tasks/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/utils/errors';
import { featureRepository, taskRepository } from '@/infra/adapters/prisma';
import { getFeatureById } from '@/domain/use-cases/features/get-feature-by-id';
import { getTasksByFeature } from '@/domain/use-cases/tasks/get-tasks-by-feature';
import { createTask } from '@/domain/use-cases/tasks/create-task';
import { z } from 'zod';

// Fibonacci sequence para story points
const VALID_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;

const createTaskSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres').max(200, 'Máximo 200 caracteres'),
  description: z.string().max(10000).nullable().optional(),
  type: z.enum(['TASK', 'BUG']).default('TASK'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  points: z.number().refine(v => VALID_POINTS.includes(v as any), {
    message: 'Points deve ser Fibonacci: 1, 2, 3, 5, 8, 13, 21'
  }).nullable().optional(),
  module: z.string().max(50).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

/**
 * GET /api/features/:id/tasks
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: featureId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // Verificar que feature existe
    await getFeatureById(featureId, tenantId, { featureRepository });

    const tasks = await getTasksByFeature(featureId, tenantId, { taskRepository });
    return jsonSuccess(tasks, { cache: 'short' });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * POST /api/features/:id/tasks
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: featureId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // Verificar que feature existe
    await getFeatureById(featureId, tenantId, { featureRepository });

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const task = await createTask(
      { orgId: tenantId, featureId, ...parsed.data },
      { taskRepository }
    );

    return jsonSuccess(task, { status: 201 });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status, body.error.details);
  }
}
```

---

### Task 5.4: Use Cases de Task (base)

**Arquivo**: `src/domain/use-cases/tasks/get-tasks-by-feature.ts`

```typescript
import type { TaskWithReadableId } from '@/shared/types';
import type { TaskRepository } from '@/infra/adapters/prisma';

export interface GetTasksByFeatureDeps {
  taskRepository: TaskRepository;
}

export async function getTasksByFeature(
  featureId: string,
  orgId: string,
  deps: GetTasksByFeatureDeps
): Promise<TaskWithReadableId[]> {
  const { taskRepository } = deps;
  return await taskRepository.findMany(orgId, { featureId });
}
```

**Arquivo**: `src/domain/use-cases/tasks/create-task.ts`

```typescript
import type { Task, TaskType, TaskPriority, StoryPoints } from '@/shared/types';
import type { TaskRepository } from '@/infra/adapters/prisma';

export interface CreateTaskInput {
  orgId: string;
  featureId: string;
  title: string;
  description?: string | null;
  type?: TaskType;
  priority?: TaskPriority;
  points?: StoryPoints | null;
  module?: string | null;
  assigneeId?: string | null;
}

export interface CreateTaskDeps {
  taskRepository: TaskRepository;
}

/**
 * Create Task Use Case
 * 
 * - local_id é gerado automaticamente pelo trigger do DB
 * - project_id é propagado automaticamente pelo trigger
 */
export async function createTask(
  input: CreateTaskInput,
  deps: CreateTaskDeps
): Promise<Task> {
  const { taskRepository } = deps;
  return await taskRepository.create(input);
}
```

---

### Task 5.5: Validar Fase 5

```bash
npm run typecheck
npm run build
```

---

## Fase 6: Use Cases & Routes - Tasks (5 tasks)

### Task 6.1: Use Cases de Task (complete)

**Arquivo**: `src/domain/use-cases/tasks/get-task-by-id.ts`

```typescript
import type { TaskWithReadableId } from '@/shared/types';
import type { TaskRepository } from '@/infra/adapters/prisma';
import { NotFoundError, ValidationError } from '@/shared/utils/errors';

export interface GetTaskByIdDeps {
  taskRepository: TaskRepository;
}

/**
 * Get Task by ID ou Readable ID (APP-123)
 */
export async function getTaskById(
  identifier: string,
  orgId: string,
  deps: GetTaskByIdDeps
): Promise<TaskWithReadableId> {
  const { taskRepository } = deps;

  // Detectar se é readable ID (contém hífen seguido de número)
  const isReadableId = /^[A-Z0-9]+-\d+$/i.test(identifier);

  let task: TaskWithReadableId | null;

  if (isReadableId) {
    task = await taskRepository.findByReadableId(identifier, orgId);
  } else {
    // Assume UUID
    const rawTask = await taskRepository.findById(identifier, orgId);
    if (rawTask) {
      // Buscar com relations para construir readable ID
      const [fullTask] = await taskRepository.findMany(orgId, {});
      task = fullTask?.id === identifier ? fullTask : null;
    } else {
      task = null;
    }
  }

  if (!task) {
    throw new NotFoundError('Task', identifier);
  }

  return task;
}
```

**Arquivo**: `src/domain/use-cases/tasks/update-task.ts`

```typescript
import type { Task, TaskStatus, TaskType, TaskPriority, StoryPoints } from '@/shared/types';
import type { TaskRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/utils/errors';

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
  points?: StoryPoints | null;
  module?: string | null;
  assigneeId?: string | null;
}

export interface UpdateTaskDeps {
  taskRepository: TaskRepository;
}

export async function updateTask(
  id: string,
  orgId: string,
  input: UpdateTaskInput,
  deps: UpdateTaskDeps
): Promise<Task> {
  const { taskRepository } = deps;

  const existing = await taskRepository.findById(id, orgId);
  if (!existing) {
    throw new NotFoundError('Task', id);
  }

  return await taskRepository.update(id, orgId, input);
}
```

**Arquivo**: `src/domain/use-cases/tasks/delete-task.ts`

```typescript
import type { TaskRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/utils/errors';

export interface DeleteTaskDeps {
  taskRepository: TaskRepository;
}

export async function deleteTask(
  id: string,
  orgId: string,
  deps: DeleteTaskDeps
): Promise<void> {
  const { taskRepository } = deps;

  const task = await taskRepository.findById(id, orgId);
  if (!task) {
    throw new NotFoundError('Task', id);
  }

  await taskRepository.delete(id, orgId);
}
```

**Arquivo**: `src/domain/use-cases/tasks/update-task-status.ts`

```typescript
import type { Task, TaskStatus } from '@/shared/types';
import type { TaskRepository } from '@/infra/adapters/prisma';
import { NotFoundError, ValidationError } from '@/shared/utils/errors';

export interface UpdateTaskStatusDeps {
  taskRepository: TaskRepository;
}

// Workflow: transições válidas de status
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  BACKLOG: ['TODO'],
  TODO: ['BACKLOG', 'DOING'],
  DOING: ['TODO', 'REVIEW'],
  REVIEW: ['DOING', 'QA_READY'],
  QA_READY: ['REVIEW', 'DONE'],
  DONE: ['QA_READY'], // Pode reabrir para QA_READY
};

/**
 * Update Task Status Use Case
 * 
 * Valida transições de workflow (opcional - pode desabilitar para MVP)
 */
export async function updateTaskStatus(
  id: string,
  orgId: string,
  newStatus: TaskStatus,
  deps: UpdateTaskStatusDeps,
  options: { validateWorkflow?: boolean } = {}
): Promise<Task> {
  const { taskRepository } = deps;
  const { validateWorkflow = false } = options;

  const task = await taskRepository.findById(id, orgId);
  if (!task) {
    throw new NotFoundError('Task', id);
  }

  // Validar transição de workflow (opcional)
  if (validateWorkflow) {
    const currentStatus = task.status as TaskStatus;
    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus];
    
    if (!allowedNextStatuses.includes(newStatus)) {
      throw new ValidationError(
        `Transição inválida: ${currentStatus} → ${newStatus}. ` +
        `Permitido: ${allowedNextStatuses.join(', ')}`
      );
    }
  }

  return await taskRepository.updateStatus(id, orgId, newStatus);
}
```

---

### Task 6.2: API Routes - Task Detail

**Arquivo**: `src/app/api/tasks/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/utils/errors';
import { taskRepository } from '@/infra/adapters/prisma';
import { getTaskById } from '@/domain/use-cases/tasks/get-task-by-id';
import { updateTask } from '@/domain/use-cases/tasks/update-task';
import { deleteTask } from '@/domain/use-cases/tasks/delete-task';
import { z } from 'zod';

const VALID_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;

const updateTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(10000).nullable().optional(),
  status: z.enum(['BACKLOG', 'TODO', 'DOING', 'REVIEW', 'QA_READY', 'DONE']).optional(),
  type: z.enum(['TASK', 'BUG']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  points: z.number().refine(v => VALID_POINTS.includes(v as any), {
    message: 'Points deve ser Fibonacci'
  }).nullable().optional(),
  module: z.string().max(50).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

/**
 * GET /api/tasks/:id
 * Aceita UUID ou readable ID (APP-123)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const task = await getTaskById(id, tenantId, { taskRepository });
    return jsonSuccess(task, { cache: 'short' });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * PATCH /api/tasks/:id
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const body = await request.json();
    
    if (!body || Object.keys(body).length === 0) {
      return jsonError('VALIDATION_ERROR', 'Nenhum campo fornecido para atualizar', 400);
    }

    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const task = await updateTask(id, tenantId, parsed.data, { taskRepository });
    return jsonSuccess(task);
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status, body.error.details);
  }
}

/**
 * DELETE /api/tasks/:id
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    await deleteTask(id, tenantId, { taskRepository });
    return new Response(null, { status: 204 });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
```

---

### Task 6.3: API Routes - Task Status Update

**Arquivo**: `src/app/api/tasks/[id]/status/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/utils/errors';
import { taskRepository } from '@/infra/adapters/prisma';
import { updateTaskStatus } from '@/domain/use-cases/tasks/update-task-status';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['BACKLOG', 'TODO', 'DOING', 'REVIEW', 'QA_READY', 'DONE']),
  // MVP: workflow validation desabilitado por default
  validateWorkflow: z.boolean().default(false),
});

/**
 * PATCH /api/tasks/:id/status
 * Endpoint dedicado para atualização de status (Kanban drag-drop)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const body = await request.json();
    const parsed = updateStatusSchema.safeParse(body);
    
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { status, validateWorkflow } = parsed.data;

    const task = await updateTaskStatus(
      id,
      tenantId,
      status,
      { taskRepository },
      { validateWorkflow }
    );

    return jsonSuccess(task);
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status, body.error.details);
  }
}
```

---

### Task 6.4: API Routes - Task Search (Global)

**Arquivo**: `src/app/api/tasks/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/utils/errors';
import { taskRepository } from '@/infra/adapters/prisma';
import { searchTasks } from '@/domain/use-cases/tasks/search-tasks';
import { z } from 'zod';

const taskFiltersSchema = z.object({
  status: z.union([
    z.enum(['BACKLOG', 'TODO', 'DOING', 'REVIEW', 'QA_READY', 'DONE']),
    z.array(z.enum(['BACKLOG', 'TODO', 'DOING', 'REVIEW', 'QA_READY', 'DONE'])),
  ]).optional(),
  type: z.enum(['TASK', 'BUG']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assigneeId: z.string().uuid().optional(),
  module: z.string().optional(),
  epicId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /api/tasks
 * Search/filter tasks across all projects
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // Parse query params
    const { searchParams } = new URL(request.url);
    const rawFilters: Record<string, any> = {};
    
    // Handle status array (multiple values)
    const statusValues = searchParams.getAll('status');
    if (statusValues.length > 0) {
      rawFilters.status = statusValues.length === 1 ? statusValues[0] : statusValues;
    }

    // Other filters
    for (const key of ['type', 'priority', 'assigneeId', 'module', 'epicId', 'search', 'page', 'pageSize', 'sortBy', 'sortOrder']) {
      const value = searchParams.get(key);
      if (value !== null) {
        rawFilters[key] = value;
      }
    }

    const parsed = taskFiltersSchema.safeParse(rawFilters);
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Filtros inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await searchTasks(tenantId, parsed.data, { taskRepository });
    
    return jsonSuccess(result, { cache: 'short' });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
```

**Arquivo**: `src/domain/use-cases/tasks/search-tasks.ts`

```typescript
import type { TaskWithReadableId, TaskFilterParams } from '@/shared/types';
import type { TaskRepository } from '@/infra/adapters/prisma';

export interface SearchTasksDeps {
  taskRepository: TaskRepository;
}

export interface SearchTasksResult {
  items: TaskWithReadableId[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Search Tasks Use Case
 * 
 * Retorna tasks com pagination + total count
 */
export async function searchTasks(
  orgId: string,
  filters: TaskFilterParams,
  deps: SearchTasksDeps
): Promise<SearchTasksResult> {
  const { taskRepository } = deps;
  const { page = 1, pageSize = 20 } = filters;

  // Executa em paralelo para performance
  const [items, total] = await Promise.all([
    taskRepository.findMany(orgId, filters),
    taskRepository.count(orgId, filters),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
```

---

### Task 6.5: Validar Fase 6

```bash
npm run typecheck
npm run build
```

**Checklist**:
- [ ] Use cases de Task completos
- [ ] API routes de Task (/api/tasks, /api/tasks/[id], /api/tasks/[id]/status)
- [ ] Search com filtros e pagination retorna total
- [ ] Readable ID suportado em GET

---

## Fase 7: Testes de Integração (5 tasks)

> **Objetivo**: Validar comportamentos críticos com testes automatizados
> **Dependências**: Fases 1-6 completas

### Task 7.1: Setup de Testes

**Arquivo**: `test/setup.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function cleanupTestData(orgId: string) {
  // Delete em ordem de dependência (cascade manual para testes)
  await prisma.task.deleteMany({ where: { orgId } });
  await prisma.feature.deleteMany({ where: { orgId } });
  await prisma.epic.deleteMany({ where: { orgId } });
  await prisma.project.deleteMany({ where: { orgId } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
}

export async function createTestOrg(name: string = 'Test Org') {
  return await prisma.organization.create({
    data: { name, slug: `test-${Date.now()}` },
  });
}

export { prisma };
```

---

### Task 7.2: Teste de Isolamento de Tenant

**Arquivo**: `test/tenant-isolation.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, createTestOrg, cleanupTestData } from './setup';
import { projectRepository } from '@/infra/adapters/prisma';

describe('Tenant Isolation', () => {
  let orgA: { id: string };
  let orgB: { id: string };

  beforeAll(async () => {
    orgA = await createTestOrg('Org A');
    orgB = await createTestOrg('Org B');
  });

  afterAll(async () => {
    await cleanupTestData(orgA.id);
    await cleanupTestData(orgB.id);
  });

  it('should not allow access to other org projects', async () => {
    // Create project in Org A
    const projectA = await projectRepository.create({
      orgId: orgA.id,
      name: 'Project A',
      key: 'PRJA',
    });

    // Try to access from Org B
    const found = await projectRepository.findById(projectA.id, orgB.id);
    
    // Should NOT find (returns null, not 403)
    expect(found).toBeNull();
  });

  it('should not leak projects in findMany', async () => {
    // Create projects in both orgs
    await projectRepository.create({
      orgId: orgA.id,
      name: 'Project A',
      key: 'PRJA2',
    });
    await projectRepository.create({
      orgId: orgB.id,
      name: 'Project B',
      key: 'PRJB',
    });

    // List from Org A
    const projectsA = await projectRepository.findMany(orgA.id);
    
    // Should only see Org A projects
    expect(projectsA.every(p => p.orgId === orgA.id)).toBe(true);
  });
});
```

---

### Task 7.3: Teste de Readable ID

**Arquivo**: `test/readable-id.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, createTestOrg, cleanupTestData } from './setup';
import { 
  projectRepository, 
  epicRepository, 
  featureRepository, 
  taskRepository 
} from '@/infra/adapters/prisma';

describe('Readable ID (local_id)', () => {
  let org: { id: string };
  let project: { id: string; key: string };

  beforeAll(async () => {
    org = await createTestOrg('Readable ID Test');
    project = await projectRepository.create({
      orgId: org.id,
      name: 'Test Project',
      key: 'APP',
    });
    
    // Create hierarchy
    const epic = await epicRepository.create({
      orgId: org.id,
      projectId: project.id,
      title: 'Test Epic',
    });
    
    await featureRepository.create({
      orgId: org.id,
      epicId: epic.id,
      title: 'Test Feature',
    });
  });

  afterAll(async () => {
    await cleanupTestData(org.id);
  });

  it('should auto-generate sequential local_id', async () => {
    const feature = await prisma.feature.findFirst({
      where: { orgId: org.id },
    });

    // Create 3 tasks
    const task1 = await taskRepository.create({
      orgId: org.id,
      featureId: feature!.id,
      title: 'Task 1',
    });

    const task2 = await taskRepository.create({
      orgId: org.id,
      featureId: feature!.id,
      title: 'Task 2',
    });

    const task3 = await taskRepository.create({
      orgId: org.id,
      featureId: feature!.id,
      title: 'Task 3',
    });

    // local_id should be 1, 2, 3
    expect(task1.localId).toBe(1);
    expect(task2.localId).toBe(2);
    expect(task3.localId).toBe(3);
  });

  it('should find by readable ID (case-insensitive)', async () => {
    // Find APP-1
    const found1 = await taskRepository.findByReadableId('APP-1', org.id);
    expect(found1).not.toBeNull();
    expect(found1?.readableId).toBe('APP-1');

    // Find app-1 (lowercase)
    const found2 = await taskRepository.findByReadableId('app-1', org.id);
    expect(found2).not.toBeNull();
    expect(found2?.id).toBe(found1?.id);
  });

  it('should reject invalid readable ID formats', async () => {
    const invalidIds = [
      'APP',        // No number
      '123',        // No key
      'A-1',        // Key too short
      'APP-0',      // localId < 1
      'APP-abc',    // Non-numeric localId
    ];

    for (const id of invalidIds) {
      await expect(
        taskRepository.findByReadableId(id, org.id)
      ).rejects.toThrow();
    }
  });
});
```

---

### Task 7.4: Teste de Cascade Delete

**Arquivo**: `test/cascade-delete.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, createTestOrg, cleanupTestData } from './setup';
import { 
  projectRepository, 
  epicRepository, 
  featureRepository, 
  taskRepository 
} from '@/infra/adapters/prisma';
import { deleteProject } from '@/domain/use-cases/projects/delete-project';

describe('Cascade Delete', () => {
  let org: { id: string };

  beforeAll(async () => {
    org = await createTestOrg('Cascade Test');
  });

  afterAll(async () => {
    await cleanupTestData(org.id);
  });

  it('should delete all nested entities when project is deleted', async () => {
    // Create full hierarchy
    const project = await projectRepository.create({
      orgId: org.id,
      name: 'Project to Delete',
      key: 'DEL',
    });

    const epic = await epicRepository.create({
      orgId: org.id,
      projectId: project.id,
      title: 'Epic to Delete',
    });

    const feature = await featureRepository.create({
      orgId: org.id,
      epicId: epic.id,
      title: 'Feature to Delete',
    });

    const task = await taskRepository.create({
      orgId: org.id,
      featureId: feature.id,
      title: 'Task to Delete',
    });

    // Delete project
    await deleteProject(project.id, org.id, { projectRepository });

    // Verify all entities were deleted
    const projectExists = await prisma.project.findUnique({ where: { id: project.id } });
    const epicExists = await prisma.epic.findUnique({ where: { id: epic.id } });
    const featureExists = await prisma.feature.findUnique({ where: { id: feature.id } });
    const taskExists = await prisma.task.findUnique({ where: { id: task.id } });

    expect(projectExists).toBeNull();
    expect(epicExists).toBeNull();
    expect(featureExists).toBeNull();
    expect(taskExists).toBeNull();
  });
});
```

---

### Task 7.5: Teste de N+1 Prevention

**Arquivo**: `test/n-plus-1.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, createTestOrg, cleanupTestData } from './setup';
import { 
  projectRepository, 
  epicRepository, 
  featureRepository, 
  taskRepository 
} from '@/infra/adapters/prisma';

describe('N+1 Prevention', () => {
  let org: { id: string };
  let queryCount: number;

  beforeAll(async () => {
    org = await createTestOrg('N+1 Test');

    // Create test data
    const project = await projectRepository.create({
      orgId: org.id,
      name: 'N+1 Test Project',
      key: 'NP1',
    });

    const epic = await epicRepository.create({
      orgId: org.id,
      projectId: project.id,
      title: 'Test Epic',
    });

    const feature = await featureRepository.create({
      orgId: org.id,
      epicId: epic.id,
      title: 'Test Feature',
    });

    // Create 10 tasks
    for (let i = 1; i <= 10; i++) {
      await taskRepository.create({
        orgId: org.id,
        featureId: feature.id,
        title: `Task ${i}`,
      });
    }

    // Setup query counter
    queryCount = 0;
    prisma.$use(async (params, next) => {
      queryCount++;
      return next(params);
    });
  });

  afterAll(async () => {
    await cleanupTestData(org.id);
  });

  it('should fetch 10 tasks with relations in ≤3 queries', async () => {
    queryCount = 0;

    const tasks = await taskRepository.findMany(org.id, {});

    // Should be:
    // 1 query for tasks with includes
    // Maybe 1-2 additional for aggregations
    expect(queryCount).toBeLessThanOrEqual(3);
    expect(tasks.length).toBe(10);
    
    // Verify relations are loaded
    expect(tasks[0].feature).toBeDefined();
    expect(tasks[0].feature.epic).toBeDefined();
    expect(tasks[0].feature.epic.project).toBeDefined();
  });
});
```

---

## 📋 Checklist Final CRUD Core

Marque cada item APENAS após validação completa:

### ✅ Repositories (Fase 1)
- [ ] ProjectRepository criado e testado
- [ ] EpicRepository criado e testado
- [ ] FeatureRepository criado e testado
- [ ] TaskRepository criado e testado
- [ ] Nenhum N+1 detectado (usar `include` com `select`)

### ✅ Use Cases - Projects (Fase 2)
- [ ] createProject valida key única
- [ ] getProjects retorna lista com counts
- [ ] getProjectById lança NotFoundError
- [ ] updateProject NÃO permite alterar key (imutável)
- [ ] deleteProject aceita cascade

### ✅ API Routes - Projects (Fase 3)
- [ ] POST /api/projects cria projeto
- [ ] GET /api/projects lista projetos
- [ ] GET /api/projects/[id] retorna um
- [ ] PATCH /api/projects/[id] atualiza (sem key)
- [ ] DELETE /api/projects/[id] deleta
- [ ] GET /api/projects/[id]/epics lista epics

### ✅ Use Cases & Routes - Epics (Fase 4)
- [ ] CRUD completo para Epics
- [ ] GET /api/epics/[id]/features funciona
- [ ] Validação de body vazio em PATCH

### ✅ Use Cases & Routes - Features (Fase 5)
- [ ] CRUD completo para Features
- [ ] GET /api/features/[id]/tasks funciona
- [ ] Points validados como Fibonacci

### ✅ Use Cases & Routes - Tasks (Fase 6)
- [ ] CRUD completo para Tasks
- [ ] GET /api/tasks com search/filters/pagination
- [ ] PATCH /api/tasks/[id]/status para Kanban
- [ ] Readable ID (APP-123) suportado em GET
- [ ] Search escapa caracteres LIKE (%, _)

### ✅ Testes de Integração (Fase 7)
- [ ] Teste de isolamento de tenant passa
- [ ] Teste de readable ID passa
- [ ] Teste de cascade delete passa
- [ ] Teste de N+1 prevention passa

### ✅ Validações Gerais
- [ ] Zod schemas validam todos inputs
- [ ] Errors retornam status correto (400, 404, 409)
- [ ] extractAuthenticatedTenant usado em TODAS as rotas
- [ ] org_id filtrado em TODAS as queries
- [ ] Cache headers aplicados (short para listas)
- [ ] PATCH retorna 400 se body vazio
- [ ] project.key é IMUTÁVEL (não pode ser alterado)

### ✅ Build & Quality
- [ ] `npm run typecheck` passa 100%
- [ ] `npm run lint` sem warnings
- [ ] `npm run build` completo
- [ ] `npm run test` passa todos os testes
- [ ] Nenhum console.error/warning

---

## 🧪 Validação Automatizada

**Script**: `scripts/validate-crud.sh`

```bash
#!/bin/bash

echo "🔍 Validando implementação CRUD..."

ERRORS=0
WARNINGS=0

# 1. Verificar arquivos criados
echo -n "📁 Verificando estrutura de arquivos... "
REQUIRED_FILES=(
  "src/infra/adapters/prisma/project.repository.ts"
  "src/infra/adapters/prisma/epic.repository.ts"
  "src/infra/adapters/prisma/feature.repository.ts"
  "src/infra/adapters/prisma/task.repository.ts"
  "src/domain/use-cases/projects/create-project.ts"
  "src/domain/use-cases/projects/update-project.ts"
  "src/domain/use-cases/epics/create-epic.ts"
  "src/domain/use-cases/features/create-feature.ts"
  "src/domain/use-cases/tasks/create-task.ts"
  "src/domain/use-cases/tasks/search-tasks.ts"
  "src/app/api/projects/route.ts"
  "src/app/api/projects/[id]/route.ts"
  "src/app/api/epics/[id]/route.ts"
  "src/app/api/features/[id]/route.ts"
  "src/app/api/tasks/route.ts"
  "src/app/api/tasks/[id]/route.ts"
  "src/app/api/tasks/[id]/status/route.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ ERRO: $file não encontrado"
    ERRORS=$((ERRORS+1))
  fi
done

if [ $ERRORS -eq 0 ]; then
  echo "✅"
fi

# 2. Verificar N+1 prevention (include sem select é warning)
echo -n "🔍 Verificando prevenção de N+1... "
if grep -r "findMany" src/infra/adapters/prisma/*.repository.ts | grep "include" | grep -v "select" > /dev/null 2>&1; then
  echo "⚠️  WARNING: include sem select detectado (possível over-fetching)"
  WARNINGS=$((WARNINGS+1))
else
  echo "✅"
fi

# 3. Verificar project.key imutável (não deve estar em updateProjectSchema)
echo -n "🔒 Verificando imutabilidade de project.key... "
if grep -r "updateProjectSchema" src/app/api/projects/*/route.ts | grep "key:" > /dev/null 2>&1; then
  echo "❌ ERRO: project.key não deve ser editável"
  ERRORS=$((ERRORS+1))
else
  echo "✅"
fi

# 4. Verificar validação de body vazio em PATCH
echo -n "📝 Verificando validação de body vazio... "
PATCH_ROUTES=$(grep -l "async function PATCH" src/app/api/**/route.ts 2>/dev/null)
for file in $PATCH_ROUTES; do
  if ! grep -q "Object.keys(body).length" "$file"; then
    echo "⚠️  WARNING: $file pode aceitar body vazio"
    WARNINGS=$((WARNINGS+1))
  fi
done
echo "✅"

# 5. Verificar await params em rotas dinâmicas
echo -n "⏳ Verificando await params... "
DYNAMIC_ROUTES=$(find src/app/api -type f -path "*\[*\]*" -name "route.ts" 2>/dev/null)
for file in $DYNAMIC_ROUTES; do
  if ! grep -q "await params" "$file"; then
    echo "❌ ERRO: $file sem await params"
    ERRORS=$((ERRORS+1))
  fi
done
echo "✅"

# 6. Verificar extractAuthenticatedTenant em todas as rotas
echo -n "🔑 Verificando autenticação... "
ALL_ROUTES=$(find src/app/api -name "route.ts" 2>/dev/null)
for file in $ALL_ROUTES; do
  if ! grep -q "extractAuthenticatedTenant" "$file"; then
    echo "❌ ERRO: $file sem extractAuthenticatedTenant"
    ERRORS=$((ERRORS+1))
  fi
done
echo "✅"

# 7. Typecheck
echo -n "📝 Typecheck... "
if npm run typecheck > /dev/null 2>&1; then
  echo "✅"
else
  echo "❌ ERRO: Typecheck falhou"
  ERRORS=$((ERRORS+1))
fi

# 8. Build
echo -n "🏗️  Build... "
if npm run build > /dev/null 2>&1; then
  echo "✅"
else
  echo "❌ ERRO: Build falhou"
  ERRORS=$((ERRORS+1))
fi

# 9. Testes (se existirem)
echo -n "🧪 Testes... "
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
  if npm run test > /dev/null 2>&1; then
    echo "✅"
  else
    echo "❌ ERRO: Testes falharam"
    ERRORS=$((ERRORS+1))
  fi
else
  echo "⏭️  Skipped (sem script de test)"
fi

# Resultado
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ Validação CRUD: APROVADO"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  Validação CRUD: APROVADO COM $WARNINGS WARNING(S)"
  exit 0
else
  echo "❌ Validação CRUD: $ERRORS ERRO(S), $WARNINGS WARNING(S)"
  exit 1
fi
```

**Executar**:
```bash
chmod +x scripts/validate-crud.sh
./scripts/validate-crud.sh
```

---

## 📊 Métricas de Sucesso

Considere CRUD Core completo se:

- [ ] **0 erros** no script de validação
- [ ] **0 queries N+1** (verificar logs de desenvolvimento)
- [ ] **100% isolamento** de tenants (org_id em todas as queries)
- [ ] **Todas as rotas** retornam 401 sem auth (correto)
- [ ] **Build time** <30 segundos
- [ ] **Typecheck time** <10 segundos
- [ ] **Todos os testes** da Fase 7 passando

---

## 🚨 Edge Cases Críticos

Consulte também: [FEATURE-crud-core-EDGE-CASES.md](./FEATURE-crud-core-EDGE-CASES.md)

### ⚠️ Armadilhas que o Sonnet 4.5 DEVE evitar:

1. **N+1 Query** - SEMPRE usar `include` com `select` específico
2. **Tenant Isolation** - NUNCA esquecer `orgId` em queries
3. **Body vazio em PATCH** - SEMPRE validar antes de processar
4. **Readable ID inválido** - SEMPRE validar formato com regex
5. **Search LIKE injection** - SEMPRE escapar `%` e `_`
6. **Project.key mutação** - NUNCA permitir alterar (quebraria readable IDs)
7. **await params** - SEMPRE fazer await em rotas dinâmicas (Next.js 15+)
8. **Cascade delete** - SEMPRE logar o que será deletado

---

## 📝 Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | 2025-12-18 | Spec inicial - Fases 1-3 (Projects) |
| 2.0 | 2025-12-18 | Spec completa - Fases 4-7 adicionadas |
| 2.1 | 2025-12-18 | **Correções críticas**: project.key imutável, validação body vazio, escape LIKE, include com select, readable ID com regex validation |
