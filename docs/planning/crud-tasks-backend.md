---
tags: [backend, tasks, crud, implementation]
priority: high
created: 2025-12-18
---

# 📋 CRUD Tasks Backend - Plano de Implementação

> Plano detalhado para implementação do CRUD de Tasks com código limpo, simples, estável e robusto.

---

## Estado Atual (Análise)

### O que já existe

| Componente | Arquivo | Status |
|------------|---------|--------|
| Task Repository | `src/infra/adapters/prisma/task.repository.ts` | ✅ 328 linhas |
| Use Cases | `src/domain/use-cases/tasks/` | ✅ 6 use cases |
| API Routes | `src/app/api/tasks/` | ⚠️ Parcial |
| Types | `src/shared/types/task.types.ts` | ✅ Completo |

### Métodos do Repository Existentes
```typescript
create(input)                    // ✅ Com validação de feature + orgId
findMany(orgId, filters)         // ✅ Com prevenção N+1 via include
findById(id, orgId)              // ✅ Simples
findByReadableId(readableId)     // ✅ Para APP-123
update(id, orgId, input)         // ✅ Validação de ownership
updateStatus(id, orgId, status)  // ✅ Operação comum
delete(id, orgId)                // ✅ Com deleteMany seguro
count(orgId, filters)            // ✅ Para pagination
```

---

## ⚠️ Edge Cases Previstos

### 1. N+1 Query Problem
- **Onde**: `findMany` com relations
- **Status**: ✅ Prevenido - usa `include` do Prisma
- **Verificação**: Logs de query em dev

### 2. Race Condition no local_id
- **Onde**: Criação simultânea no mesmo projeto
- **Causa**: Trigger `set_task_local_id()` 
- **Status**: ✅ Mitigado - `FOR UPDATE` lock no DB

### 3. Validação de módulo inexistente
- **Onde**: `create` com `module` não existente em `projects.modules`
- **Status**: ❌ Não implementado
- **Ação**: Adicionar validação no repository

### 4. Transição de status inválida
- **Onde**: Pular de `BACKLOG` para `DONE`
- **Decisão MVP**: Transição livre (sem validação rígida)
- **Futuro**: Flag `strictWorkflow` no projeto

---

## Fase 1: Auditoria e Correções

| # | Task | Arquivo | Complexidade |
|---|------|---------|--------------|
| 1.1 | Verificar prevenção N+1 | `task.repository.ts` | Baixa |
| 1.2 | Adicionar validação de módulo | `task.repository.ts` | Média |
| 1.3 | Revisar validações Zod | `/api/tasks/*` | Baixa |
| 1.4 | Implementar POST create | `/api/features/[id]/tasks/` | Média |
| 1.5 | Testar e documentar | `create-task.md` | Baixa |

### Detalhes

**Task 1.2 - Validação de módulo**:
```typescript
// Antes de criar, validar se module existe
if (input.module) {
  const project = await this.prisma.project.findUnique({ 
    where: { id: feature.epic.projectId } 
  });
  if (!project?.modules.includes(input.module)) {
    throw new ValidationError(`Módulo "${input.module}" não existe no projeto`);
  }
}
```

**Task 1.4 - Schema de criação**:
```typescript
const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).nullable().optional(),
  type: z.enum(['TASK', 'BUG']).default('TASK'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  points: z.number().refine(v => [1,2,3,5,8,13,21].includes(v)).nullable().optional(),
  module: z.string().max(50).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});
```

---

## Fase 2: Read/Search Completo

| # | Task | Arquivo | Complexidade |
|---|------|---------|--------------|
| 2.1 | GET /api/tasks/[id] | `/api/tasks/[id]/route.ts` | Baixa |
| 2.2 | `findByIdWithRelations` | `task.repository.ts` | Média |
| 2.3 | Filtro por projectId | `task.repository.ts` | Baixa |
| 2.4 | GET por readable ID | `/api/tasks/readable/[id]/route.ts` | Média |
| 2.5 | Testar paginação | - | Baixa |

### Detalhes

**Task 2.2 - Novo método**:
```typescript
async findByIdWithRelations(id: string, orgId: string): Promise<TaskWithRelations | null> {
  return this.prisma.task.findFirst({
    where: { id, orgId },
    include: {
      feature: { 
        select: { 
          id: true, 
          title: true, 
          epic: { 
            select: { id: true, title: true, project: { select: { id: true, name: true, key: true } } }
          } 
        } 
      },
      comments: { 
        orderBy: { createdAt: 'desc' },
        take: 10 
      },
    },
  });
}
```

---

## Fase 3: Update/Delete Seguros

| # | Task | Arquivo | Complexidade |
|---|------|---------|--------------|
| 3.1 | Validar input PATCH | `/api/tasks/[id]/route.ts` | Baixa |
| 3.2 | Documentar workflow | `update-task-status.md` | Baixa |
| 3.3 | Testar cascade delete | - | Baixa |
| 3.4 | Error handling específico | Todos | Média |

### Workflow de Status
```
BACKLOG → TODO → DOING → REVIEW → QA_READY → DONE
```

**MVP**: Transição livre (sem validação rígida)

### Códigos de Erro
| Código | HTTP | Quando |
|--------|------|--------|
| `NOT_FOUND` | 404 | Task não existe |
| `VALIDATION_ERROR` | 400 | Dados inválidos |
| `FORBIDDEN` | 403 | Sem permissão |

---

## Fase 4: Testes e Documentação

| # | Task | Arquivo | Complexidade |
|---|------|---------|--------------|
| 4.1 | Executar testes unit | `*.spec.ts` | Baixa |
| 4.2 | Testar API via cURL | - | Baixa |
| 4.3 | Atualizar docs use cases | `*.md` | Baixa |

---

## Resumo de Mudanças

### Arquivos a Modificar
| Arquivo | Mudança |
|---------|---------|
| `task.repository.ts` | Validação módulo, `findByIdWithRelations` |
| `/api/tasks/route.ts` | Filtro `projectId` |
| `/api/tasks/[id]/route.ts` | Adicionar GET |

### Arquivos a Criar
| Arquivo | Conteúdo |
|---------|----------|
| `/api/features/[id]/tasks/route.ts` | POST create task |
| `/api/tasks/readable/[readableId]/route.ts` | GET por readable ID |

---

## Decisões Pendentes

1. **Validação rígida de workflow?** (BACKLOG→TODO→DOING...)
2. **Validar `module` em `projects.modules`?**
3. **Soft-delete vs hard-delete para tasks?**
