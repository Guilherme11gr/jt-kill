---
tags: [planning, crud, edge-cases, validation, critical]
priority: critical
created: 2025-12-18
parent-spec: FEATURE-crud-core.md
target-agent: sonnet-4.5
---

# 🔍 Edge Cases & Validation Guide - CRUD Core

> **Objetivo**: Garantir 90%+ de precisão na implementação do CRUD Core pelo Sonnet 4.5.
> 
> **Use este documento JUNTO com**: [FEATURE-crud-core.md](./FEATURE-crud-core.md)

---

## 🚨 Armadilhas Críticas - CRUD Specific

### ⚠️ Armadilha #1: N+1 Query Problem (CRÍTICO)

**Erro mais comum em CRUD**:
```typescript
// ❌ ERRADO - N+1 queries
const tasks = await prisma.task.findMany({ where: { orgId } });
for (const task of tasks) {
  const feature = await prisma.feature.findUnique({ where: { id: task.featureId } });
  console.log(feature.title); // 1 + N queries!
}
```

**Correto**:
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
// Agora task.feature.title está disponível
```

**Como detectar N+1 durante desenvolvimento**:

1. **Habilitar query logging** no Prisma:
```typescript
// src/infra/adapters/prisma/index.ts
export const prisma = new PrismaClient({
  log: ['query'], // ← Mostra TODAS as queries no console
});
```

2. **Chamar endpoint**:
```bash
curl http://localhost:3000/api/tasks
```

3. **Verificar logs**:
```
# ❌ MAL SINAL - múltiplas queries SELECT
prisma:query SELECT "id", "title" FROM "tasks" WHERE "org_id" = $1
prisma:query SELECT "id", "title" FROM "features" WHERE "id" = $1
prisma:query SELECT "id", "title" FROM "features" WHERE "id" = $2
prisma:query SELECT "id", "title" FROM "features" WHERE "id" = $3
# ^ Isso é N+1!

# ✅ BOM SINAL - query única com JOIN
prisma:query SELECT t.*, f.id AS "feature_id", f.title AS "feature_title" FROM "tasks" t LEFT JOIN "features" f ON f.id = t.feature_id WHERE t.org_id = $1
```

**Validação automatizada**:
```typescript
// test/helpers/detect-n-plus-1.ts
let queryCount = 0;

prisma.$use(async (params, next) => {
  queryCount++;
  const result = await next(params);
  return result;
});

// Em teste:
queryCount = 0;
await getTasks(orgId, { taskRepository });
console.assert(queryCount <= 2, `N+1 detected: ${queryCount} queries`);
```

---

### ⚠️ Armadilha #2: Cascade Delete sem Confirmação

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - deleta projeto sem verificar se tem dados
export async function deleteProject(id: string, orgId: string) {
  await prisma.project.delete({ where: { id } });
  // Se projeto tem 1000 tasks, TODAS são deletadas sem warning!
}
```

**Correto (MVP)**:
```typescript
// ✅ CERTO - pelo menos logar o que será deletado
export async function deleteProject(id: string, orgId: string, deps) {
  const { projectRepository } = deps;
  
  // Buscar projeto com contagens
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          epics: true,
          tasks: true,
        },
      },
    },
  });

  if (!project) {
    throw new NotFoundError('Projeto', id);
  }

  // Log para auditoria
  console.warn(`[AUDIT] Deleting project ${id} with ${project._count.tasks} tasks`);

  // Delete (cascade via DB)
  await projectRepository.delete(id, orgId);
}
```

**Validação manual**:

1. **Criar projeto com tasks**:
```sql
INSERT INTO projects (...) VALUES (...);
INSERT INTO epics (...) VALUES (...);
INSERT INTO features (...) VALUES (...);
INSERT INTO tasks (...) VALUES (...);
```

2. **Deletar projeto via API**:
```bash
curl -X DELETE http://localhost:3000/api/projects/{id}
```

3. **Verificar logs**:
```
[AUDIT] Deleting project abc123 with 5 tasks
```

4. **Verificar DB** (tasks devem ter sumido):
```sql
SELECT COUNT(*) FROM tasks WHERE project_id = 'abc123';
-- Esperado: 0
```

---

### ⚠️ Armadilha #3: Race Condition em Duplicate Key Check

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - race condition entre check e insert
const existing = await projectRepository.findByKey(key, orgId);
if (existing) {
  throw new ConflictError('Key já existe');
}
// ← Entre essas duas linhas, outro request pode inserir o mesmo key!
await projectRepository.create({ key, ... });
```

**Solução 1 - Deixar DB lançar erro (RECOMENDADO)**:
```typescript
// ✅ CERTO - usar unique constraint do DB
try {
  return await projectRepository.create({ key, ... });
} catch (error) {
  // Prisma lança P2002 para unique constraint violation
  if (error.code === 'P2002') {
    throw new ConflictError('Key já existe');
  }
  throw error;
}
```

**Solução 2 - Transaction com lock (se necessário)**:
```typescript
// ✅ CERTO - usar transaction
await prisma.$transaction(async (tx) => {
  const existing = await tx.project.findFirst({
    where: { key, orgId },
    // FOR UPDATE lock previne race condition
  });
  
  if (existing) {
    throw new ConflictError('Key já existe');
  }
  
  return await tx.project.create({ ... });
});
```

**Teste de race condition**:

```typescript
// test/race-condition.test.ts
import { Promise } from 'bluebird';

test('concurrent creates with same key should fail', async () => {
  const promises = Array.from({ length: 10 }, () =>
    createProject({ key: 'TEST', orgId, ... }, deps)
  );

  const results = await Promise.allSettled(promises);
  
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  // Apenas 1 deve ter sucesso, 9 devem falhar com ConflictError
  expect(succeeded).toBe(1);
  expect(failed).toBe(9);
});
```

---

### ⚠️ Armadilha #4: Validação de Modules Vazio vs Null

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - aceita array vazio diferente de null
modules: z.array(z.string()).optional()

// Cliente envia: { modules: [] }
// Salvo no DB: modules = []
// Esperado: modules deveria ser omitido se vazio
```

**Correto**:
```typescript
// ✅ CERTO - transformar [] em null ou undefined
const createProjectSchema = z.object({
  modules: z.array(z.string().min(1).max(50))
    .max(20)
    .optional()
    .transform(arr => arr && arr.length > 0 ? arr : undefined),
});

// Agora [] vira undefined automaticamente
```

**Teste**:
```typescript
const result = createProjectSchema.parse({ modules: [] });
console.assert(result.modules === undefined, 'Empty array should be undefined');
```

---

### ⚠️ Armadilha #5: Readable ID Parse Failure

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - não valida formato
export async function findByReadableId(readableId: string) {
  const [projectKey, localIdStr] = readableId.split('-');
  const localId = parseInt(localIdStr); // NaN se formato errado!
  
  return await prisma.task.findFirst({
    where: { localId, project: { key: projectKey } }
  });
  // Query retorna null mas não explica por quê
}
```

**Correto**:
```typescript
// ✅ CERTO - validar formato antes de query
export async function findByReadableId(readableId: string, orgId: string) {
  // Validar formato: PROJECT-123
  const match = readableId.match(/^([A-Z0-9]{2,10})-(\d+)$/);
  if (!match) {
    throw new ValidationError(`ID inválido: "${readableId}". Formato esperado: PROJECT-123`);
  }

  const [_, projectKey, localIdStr] = match;
  const localId = parseInt(localIdStr, 10);

  const task = await prisma.task.findFirst({
    where: {
      orgId,
      localId,
      project: { key: projectKey.toUpperCase() },
    },
  });

  if (!task) {
    throw new NotFoundError('Task', readableId);
  }

  return task;
}
```

**Testes de edge cases**:
```typescript
// test/readable-id.test.ts
const invalidIds = [
  'APP',           // Sem número
  '123',           // Sem key
  'app-123',       // Lowercase (deveria aceitar e normalizar)
  'APP-abc',       // Número inválido
  'VERYLONGKEY-1', // Key muito longa (>10)
  'A-1',           // Key muito curta (<2)
  '',              // Vazio
  'APP-0',         // localId não pode ser 0
];

for (const id of invalidIds) {
  await expect(findByReadableId(id, orgId)).rejects.toThrow(ValidationError);
}

// Casos válidos
await expect(findByReadableId('APP-1', orgId)).resolves.toBeDefined();
await expect(findByReadableId('app-1', orgId)).resolves.toBeDefined(); // Case-insensitive
```

---

### ⚠️ Armadilha #6: Update com Partial Input Vazio

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - aceita update vazio (não faz nada mas retorna 200)
export async function PATCH(request, { params }) {
  const body = await request.json();
  // body = {} ← válido mas inútil
  
  const project = await updateProject(id, orgId, body, deps);
  return jsonSuccess(project); // 200 OK mas nada mudou
}
```

**Correto**:
```typescript
// ✅ CERTO - validar que pelo menos 1 campo foi fornecido
export async function PATCH(request, { params }) {
  const body = await request.json();
  
  // Validar que body tem pelo menos 1 campo
  if (Object.keys(body).length === 0) {
    return jsonError('VALIDATION_ERROR', 'Nenhum campo fornecido para atualizar', 400);
  }

  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const project = await updateProject(id, orgId, parsed.data, deps);
  return jsonSuccess(project);
}
```

**Teste**:
```bash
curl -X PATCH http://localhost:3000/api/projects/123 \
  -H "Content-Type: application/json" \
  -d '{}'

# Esperado: 400 Bad Request
# { "error": { "code": "VALIDATION_ERROR", "message": "Nenhum campo fornecido..." } }
```

---

### ⚠️ Armadilha #7: Filter Injection via Query Params

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - aceita qualquer query param sem validação
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  
  // Se status = "'; DROP TABLE tasks; --" ?!
  const tasks = await prisma.task.findMany({
    where: { status }, // Prisma protege contra SQL injection, mas...
  });
}
```

**Correto**:
```typescript
// ✅ CERTO - validar TODOS os query params
const taskFiltersSchema = z.object({
  status: z.enum(['BACKLOG', 'TODO', 'DOING', 'REVIEW', 'QA_READY', 'DONE']).optional(),
  type: z.enum(['TASK', 'BUG']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assigneeId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  
  const parsed = taskFiltersSchema.safeParse({
    status: searchParams.get('status'),
    type: searchParams.get('type'),
    priority: searchParams.get('priority'),
    assigneeId: searchParams.get('assigneeId'),
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize'),
  });

  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Filtros inválidos', 400, {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const tasks = await getTasks(orgId, parsed.data, deps);
  return jsonSuccess(tasks);
}
```

**Teste de valores maliciosos**:
```bash
curl "http://localhost:3000/api/tasks?status=INVALID"
# Esperado: 400 Bad Request

curl "http://localhost:3000/api/tasks?status='; DROP TABLE tasks; --"
# Esperado: 400 Bad Request

curl "http://localhost:3000/api/tasks?page=-1"
# Esperado: 400 Bad Request

curl "http://localhost:3000/api/tasks?pageSize=999999"
# Esperado: 400 Bad Request (max 100)
```

---

### ⚠️ Armadilha #8: Tenant Isolation Bypass

**Erro CRÍTICO que o Sonnet pode cometer**:
```typescript
// ❌ PERIGO - não filtra por orgId!
export async function getProjectById(id: string, deps) {
  // ← FALTA orgId aqui!
  return await deps.projectRepository.findById(id);
}

// Usuário da Org A pode acessar projeto da Org B!
```

**Correto**:
```typescript
// ✅ CERTO - SEMPRE passar e filtrar por orgId
export async function getProjectById(id: string, orgId: string, deps) {
  const project = await deps.projectRepository.findById(id, orgId);
  
  if (!project) {
    // 404 ao invés de 403 para não vazar existência
    throw new NotFoundError('Projeto', id);
  }
  
  return project;
}
```

**Teste de isolamento**:

```typescript
// test/tenant-isolation.test.ts
test('user cannot access other org data', async () => {
  // Setup: Criar 2 orgs
  const orgA = await createOrg({ name: 'Org A' });
  const orgB = await createOrg({ name: 'Org B' });
  
  // Criar projeto na Org A
  const projectA = await createProject({ orgId: orgA.id, ... });
  
  // Tentar acessar projeto da Org A usando credencial da Org B
  await expect(
    getProjectById(projectA.id, orgB.id, deps)
  ).rejects.toThrow(NotFoundError); // ← Deve falhar!
});
```

**Checklist de validação** (para CADA use case):
- [ ] Função recebe `orgId` como parâmetro
- [ ] Repository filtra por `orgId`
- [ ] Não retorna erro 403 (vaza existência), usa 404
- [ ] Teste de isolamento criado e passando

---

### ⚠️ Armadilha #9: Prisma findUnique vs findFirst

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - findUnique só aceita campos únicos
return await prisma.project.findUnique({
  where: { id, orgId }, // ← Erro! (id, orgId) não é unique key
});
// Prisma: "Argument where.orgId is missing"
```

**Correto**:
```typescript
// ✅ CERTO - usar findFirst para múltiplos campos
return await prisma.project.findFirst({
  where: { id, orgId },
});

// OU se id já é unique:
const project = await prisma.project.findUnique({
  where: { id },
});

// E validar orgId manualmente:
if (!project || project.orgId !== orgId) {
  throw new NotFoundError('Projeto', id);
}
```

**Quando usar cada um**:

| Método | Quando Usar | Performance |
|--------|-------------|-------------|
| `findUnique` | Campo é PRIMARY KEY ou UNIQUE constraint | ⚡ Mais rápido (usa index) |
| `findFirst` | Múltiplos campos OU campos não-únicos | 🐢 Mais lento (full scan se sem index) |

**Validação**:
```bash
# Se vê este erro no terminal:
# "Invalid `prisma.project.findUnique()` invocation: Argument orgId is missing"
# → Trocar findUnique por findFirst
```

---

### ⚠️ Armadilha #10: Forget to Await Params in Next.js 15+

**Erro que o Sonnet pode cometer** (Next.js 15+ mudou API):
```typescript
// ❌ ERRADO - params é Promise no Next.js 15+
export async function GET(request, { params }) {
  const { id } = params; // ← params é Promise<{ id: string }>!
  // id é undefined!
}
```

**Correto**:
```typescript
// ✅ CERTO - await params
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ← await!
  // Agora id está definido
}
```

**Validação**:
```bash
# Se vê undefined em logs ao acessar /api/projects/123:
# "Project ID: undefined"
# → FALTA await params
```

---

## 🧪 Edge Cases por Entidade

### Projects

| Edge Case | Teste | Resultado Esperado |
|-----------|-------|-------------------|
| **Key vazio** | `{ key: '' }` | 400 ValidationError |
| **Key muito longo** | `{ key: 'A'.repeat(20) }` | 400 ValidationError |
| **Key com espaços** | `{ key: 'APP 1' }` | 400 ValidationError |
| **Key lowercase** | `{ key: 'app' }` | Aceita, converte para 'APP' |
| **Modules duplicados** | `{ modules: ['API', 'API'] }` | 400 ValidationError |
| **Modules array vazio** | `{ modules: [] }` | Aceita, converte para `undefined` |
| **Delete com tasks** | Projeto com 100 tasks | 204, cascade delete tudo |
| **Duplicate key concurrent** | 10 requests simultâneos | 1 sucesso, 9 conflitos |

### Tasks

| Edge Case | Teste | Resultado Esperado |
|-----------|-------|-------------------|
| **Points = 0** | `{ points: 0 }` | 400 ValidationError (0 não é Fibonacci) |
| **Points = null** | `{ points: null }` | Aceita (task não estimada) |
| **Points = 4** | `{ points: 4 }` | 400 ValidationError (não é Fibonacci) |
| **Readable ID 'APP-0'** | GET /api/tasks/APP-0 | 404 NotFoundError (localId começa em 1) |
| **Readable ID 'app-1'** | GET /api/tasks/app-1 | 200 OK (case-insensitive) |
| **Assignee inexistente** | `{ assigneeId: 'uuid-fake' }` | 400 ValidationError (FK constraint) |
| **Status inválido** | `{ status: 'INVALID' }` | 400 ValidationError |
| **Module não em project.modules** | `{ module: 'iOS' }` mas project só tem ['API', 'WEB'] | ⚠️ MVP aceita, validar depois |

### Filters & Pagination

| Edge Case | Teste | Resultado Esperado |
|-----------|-------|-------------------|
| **page = 0** | `?page=0` | 400 ValidationError (min 1) |
| **page = -1** | `?page=-1` | 400 ValidationError |
| **pageSize = 0** | `?pageSize=0` | 400 ValidationError |
| **pageSize = 1000** | `?pageSize=1000` | 400 ValidationError (max 100) |
| **status = multiple** | `?status=TODO&status=DOING` | Aceita ambos (OR) |
| **search vazio** | `?search=` | Ignora filtro (retorna tudo) |
| **search SQL injection** | `?search=' OR 1=1--` | Prisma escapa automaticamente |

---

## 📋 Checklist de Validação por Fase

### Fase 1: Repositories

- [ ] **findMany** sempre usa `include` quando precisa de relations
- [ ] **findById** filtra por `orgId` E `id`
- [ ] **create** retorna o objeto criado
- [ ] **update** lança erro se não encontrar
- [ ] **delete** não retorna nada (void)
- [ ] **Nenhum N+1** detectado (habilitar query logging)

### Fase 2: Use Cases

- [ ] **TODOS recebem orgId** como parâmetro
- [ ] **Validações** lançam `ValidationError` com mensagem clara
- [ ] **Not found** lança `NotFoundError` (não 403)
- [ ] **Conflicts** lançam `ConflictError`
- [ ] **Nenhuma dependência** de framework (Next, Supabase)

### Fase 3: API Routes

- [ ] **extractAuthenticatedTenant** chamado em TODAS as rotas
- [ ] **Zod validation** ANTES de chamar use case
- [ ] **handleError** centraliza error handling
- [ ] **jsonSuccess** com cache headers apropriados
- [ ] **await params** em rotas dinâmicas [id]
- [ ] **Query params** validados com Zod

---

## 🔬 Testes de Regressão

Execute estes testes SEMPRE que modificar CRUD:

### 1. Teste de N+1

```typescript
// Enable query logging
prisma.$on('query', (e) => {
  console.log('Query:', e.query);
});

// Call endpoint
const response = await fetch('http://localhost:3000/api/tasks');

// Count queries in logs
// Should be ≤ 2 queries (1 for tasks + 1 for count)
```

### 2. Teste de Isolamento de Tenant

```typescript
// Create 2 orgs with data
const orgA = await createTestOrg();
const orgB = await createTestOrg();

const projectA = await createProject({ orgId: orgA.id });
const projectB = await createProject({ orgId: orgB.id });

// Try to access Org A data with Org B credentials
const response = await fetch(`/api/projects/${projectA.id}`, {
  headers: { Authorization: `Bearer ${orgB.token}` },
});

expect(response.status).toBe(404); // NOT 403!
```

### 3. Teste de Cascade Delete

```typescript
const project = await createProject({ orgId });
const epic = await createEpic({ projectId: project.id });
const feature = await createFeature({ epicId: epic.id });
const task = await createTask({ featureId: feature.id });

// Delete project
await deleteProject(project.id, orgId);

// Verify all related data was deleted
const taskExists = await prisma.task.findUnique({ where: { id: task.id } });
expect(taskExists).toBeNull();
```

### 4. Teste de Readable ID

```typescript
// Create task (localId auto-generated)
const task = await createTask({ featureId, ... });

// Should have localId = 1 (first task in project)
expect(task.localId).toBe(1);

// Find by readable ID
const found = await findByReadableId('APP-1', orgId);
expect(found.id).toBe(task.id);

// Create second task
const task2 = await createTask({ featureId, ... });
expect(task2.localId).toBe(2); // Auto-increment
```

---

## 📊 Script de Validação Automatizada

**Arquivo**: `scripts/validate-crud-edge-cases.sh`

```bash
#!/bin/bash

echo "🧪 Validando edge cases CRUD..."

ERRORS=0

# 1. Verificar N+1 prevention
echo -n "🔍 Verificando prevenção de N+1... "
if grep -r "\.findMany(" src/infra/adapters/prisma/*.repository.ts | \
   grep -v "include" | \
   grep -v "count" > /dev/null; then
  echo "❌ ERRO: findMany sem include detectado"
  ERRORS=$((ERRORS+1))
else
  echo "✅"
fi

# 2. Verificar orgId em todos os use cases
echo -n "🔒 Verificando isolamento de tenant... "
if grep -r "async function" src/domain/use-cases/**/*.ts | \
   grep -v "orgId" | \
   grep -v "// No orgId needed" > /dev/null; then
  echo "⚠️  WARNING: Use case sem orgId detectado"
fi
echo "✅"

# 3. Verificar extractAuthenticatedTenant em rotas
echo -n "🔑 Verificando autenticação em rotas... "
ROUTE_FILES=$(find src/app/api -name "route.ts")
for file in $ROUTE_FILES; do
  if ! grep -q "extractAuthenticatedTenant" "$file"; then
    echo "❌ ERRO: $file sem extractAuthenticatedTenant"
    ERRORS=$((ERRORS+1))
  fi
done
echo "✅"

# 4. Verificar validação com Zod em rotas POST/PATCH
echo -n "📝 Verificando validações Zod... "
for file in $ROUTE_FILES; do
  if grep -q "export async function POST\|export async function PATCH" "$file"; then
    if ! grep -q "safeParse\|parse" "$file"; then
      echo "❌ ERRO: $file sem validação Zod"
      ERRORS=$((ERRORS+1))
    fi
  fi
done
echo "✅"

# 5. Verificar await params em rotas dinâmicas
echo -n "⏳ Verificando await params... "
DYNAMIC_ROUTES=$(find src/app/api -type f -path "*/\[*\]/*" -name "route.ts")
for file in $DYNAMIC_ROUTES; do
  if ! grep -q "await params" "$file"; then
    echo "❌ ERRO: $file sem await params"
    ERRORS=$((ERRORS+1))
  fi
done
echo "✅"

# Resultado
echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ Validação edge cases: APROVADO"
  exit 0
else
  echo "❌ Validação edge cases: $ERRORS erro(s)"
  exit 1
fi
```

**Executar**:
```bash
chmod +x scripts/validate-crud-edge-cases.sh
./scripts/validate-crud-edge-cases.sh
```

---

## 🎯 Métricas de Qualidade

Considere CRUD Core de alta qualidade se:

- [ ] **0 erros** no script de validação de edge cases
- [ ] **100% coverage** de validações Zod em rotas POST/PATCH
- [ ] **0 N+1 queries** detectadas (query logging habilitado)
- [ ] **100% isolamento** de tenants (todos os testes de isolamento passam)
- [ ] **4+ edge cases** testados por entidade
- [ ] **Cascade delete** testado e documentado

---

## 📝 Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | 2025-12-18 | Documento inicial - 10 armadilhas + edge cases por entidade |
