# 🔍 Auditoria de Compatibilidade: Arquitetura Real-time vs Projeto Atual

> **Data:** Janeiro 2026  
> **Status:** ✅ Auditoria Completa  
> **Conclusão:** Plano é **compatível** com arquitetura existente, mas requer ajustes

---

## 📋 Sumário Executivo

A arquitetura enterprise proposta em `arquitetura-enterprise.md` é **compatível** com o projeto atual, mas existem:

- ✅ **5 pontos de total alinhamento** (já prontos para usar)
- ⚠️ **4 ajustes necessários** (adaptações no plano)
- 🚨 **2 riscos identificados** (precisam atenção)

---

## ✅ Pontos de Alinhamento Total

### 1. Query Keys Structure

**Plano propôs:**
```typescript
['tasks', 'list', projectId]
['features', featureId]
```

**Projeto usa:**
```typescript
// src/lib/query/query-keys.ts
queryKeys.tasks.list(orgId, filters)  // => ['org', orgId, 'tasks', 'list', filters]
queryKeys.features.detail(orgId, id)  // => ['org', orgId, 'features', 'detail', id]
```

✅ **Compatível:** O projeto já usa **org-scoped keys** (primeiro elemento é `['org', orgId]`).
O plano precisa apenas adaptar para usar o factory existente.

**Ajuste no INVALIDATION_MAP:**
```typescript
// ANTES (plano)
'task.created': (e) => [
  ['tasks', 'list', e.projectId],
]

// DEPOIS (compatível)
'task.created': (e, orgId) => [
  queryKeys.tasks.lists(orgId),
  queryKeys.features.detail(orgId, e.metadata?.featureId),
]
```

---

### 2. Cache Tiers Existentes

**Plano propôs:** `staleTime: 0` para dados mutáveis

**Projeto já tem:**
```typescript
// src/lib/query/cache-config.ts
CACHE_TIMES.REALTIME: { staleTime: 0, gcTime: 1 * MINUTE }
CACHE_TIMES.FRESH: { staleTime: 5 * SECOND, gcTime: 5 * MINUTE }
```

✅ **Totalmente alinhado:** Tier `REALTIME` já existe para dados live.
Após implementar real-time, migrar tasks/comments de `FRESH` para `REALTIME`.

---

### 3. Smart Invalidation Helpers

**Plano propôs:** Invalidação com `refetchType: 'active'`

**Projeto já usa:**
```typescript
// src/lib/query/helpers.ts
export function smartInvalidate(queryClient, queryKey) {
  queryClient.invalidateQueries({ 
    queryKey,
    refetchType: 'active' // ✅ JÁ IMPLEMENTADO!
  });
}

export function smartInvalidateMany(queryClient, keys) { ... }
export function invalidateDashboardQueries(queryClient, orgId) { ... }
```

✅ **Pronto para usar:** Basta chamar os helpers existentes no event processor.

---

### 4. Supabase Client (Browser)

**Projeto já tem:**
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

✅ **Pronto para channels:** `createBrowserClient` suporta `.channel()` nativamente.

---

### 5. Audit Log Table Existente

**Plano propôs:** Tabela `entity_events` para event sourcing

**Projeto já tem:**
```prisma
// prisma/schema.prisma
model AuditLog {
  id           String       @id @db.Uuid
  orgId        String       @map("org_id") @db.Uuid
  userId       String       @map("user_id") @db.Uuid
  action       String       // "task.status.changed"
  targetType   String?      @map("target_type") // "task"
  targetId     String?      @map("target_id") @db.Uuid
  metadata     Json?
  createdAt    DateTime     @default(now())
  
  @@index([orgId, createdAt(sort: Desc)])
  @@map("audit_logs")
}
```

✅ **Quase igual!** Diferenças menores:
- Falta `sequence_number` (add via migration)
- Falta `actor_type` (agent vs user - add column)
- Falta `client_id` (para dedup multi-tab - add column)

---

## ⚠️ Ajustes Necessários no Plano

### 1. INVALIDATION_MAP Precisa Usar OrgId

**Problema:** O plano não considera que TODAS as query keys são org-scoped.

**Solução:**
```typescript
// Ajustar o mapa para receber orgId
const INVALIDATION_MAP: Record<string, (e: BroadcastEvent, orgId: string) => QueryKey[]> = {
  'task.created': (e, orgId) => [
    queryKeys.tasks.lists(orgId),
    queryKeys.features.detail(orgId, e.metadata?.featureId),
    queryKeys.dashboard.all(orgId),
  ],
  
  'task.status_changed': (e, orgId) => [
    queryKeys.tasks.detail(orgId, e.entityId),
    queryKeys.tasks.lists(orgId),
    queryKeys.features.detail(orgId, e.metadata?.featureId),
    queryKeys.epics.detail(orgId, e.metadata?.epicId),
    queryKeys.dashboard.myTasks(orgId),
    queryKeys.dashboard.activity(orgId),
  ],
  // ...
};
```

---

### 2. Dashboard Activity Já Existe

**Insight:** `/api/dashboard/activity` já consulta `audit_logs` para mostrar atividade da equipe.

```typescript
// src/app/api/dashboard/activity/route.ts
const logs = await prisma.$queryRaw`
  SELECT a.*, u.display_name, t.title, p.key
  FROM public.audit_logs a
  LEFT JOIN public.user_profiles u ON ...
  WHERE a.org_id = ${tenantId}
    AND a.user_id != ${userId}  -- Exclui próprio usuário
  ORDER BY a.created_at DESC
`;
```

**Ajuste:** Real-time deve invalidar `dashboard.activity` quando eventos chegarem:
```typescript
// Adicionar ao INVALIDATION_MAP para TODOS os event types
queryKeys.dashboard.activity(orgId)
```

---

### 3. Optimistic Updates Já Existem (Parcialmente)

**Projeto já tem optimistic em:**
- ✅ `useCreateTask()` - add to list + refetch
- ✅ `useUpdateTask()` - update in cache + refetch
- ✅ `useDeleteTask()` - remove + rollback on error
- ✅ `useMoveTask()` - status change + rollback

**Problema:** Os hooks fazem `smartInvalidate` no `onSuccess/onSettled`.
Com real-time, isso é redundante (evento vai invalidar).

**Solução:** Criar flag para desabilitar invalidação quando real-time está ativo:
```typescript
const mutation = useMutation({
  onSettled: () => {
    // Só invalida se real-time não está conectado
    if (!realtimeConnected) {
      smartInvalidate(queryClient, queryKeys.tasks.lists(orgId));
    }
  },
});
```

---

### 4. Entity Events Table Precisa Migration

**Campos faltando no AuditLog atual:**

```sql
-- Migration necessária
ALTER TABLE audit_logs 
ADD COLUMN sequence_number BIGSERIAL,
ADD COLUMN actor_type VARCHAR(20) DEFAULT 'user',
ADD COLUMN client_id UUID;

-- Index para real-time queries
CREATE INDEX idx_audit_logs_sequence 
ON audit_logs (org_id, sequence_number DESC);
```

**Alternativa:** Criar tabela separada `entity_events` (mais limpo, não polui audit_logs existente).

---

## 🚨 Riscos Identificados

### 1. Cache Atual Muito Generoso

**Problema encontrado:**
```typescript
// src/lib/query/hooks/use-tasks.ts
staleTime: 5_000, // 5 segundos
```

Mas em `cache-config.ts`:
```typescript
CACHE_TIMES.FRESH = { staleTime: 5 * SECOND }
```

**Inconsistência:** Alguns hooks usam valores hardcoded, outros usam tiers.

**Risco:** Com real-time, dados podem parecer desatualizados por até 5s após evento.

**Solução:** 
1. Padronizar todos os hooks para usar `CACHE_TIMES`
2. Após real-time, mudar tasks/comments para `CACHE_TIMES.REALTIME`

---

### 2. Multiple Invalidations Redundantes

**Exemplo em `use-tasks.ts`:**
```typescript
onSuccess: (newTask) => {
  // 1. Optimistic update
  queryClient.setQueriesData(...);
  
  // 2. Invalida tasks
  smartInvalidate(queryClient, queryKeys.tasks.lists(orgId));
  
  // 3. Invalida feature
  smartInvalidate(queryClient, queryKeys.features.detail(orgId, newTask.featureId));
  
  // 4. Invalida dashboard (3 queries)
  invalidateDashboardQueries(queryClient, orgId);
}
```

**Problema:** São **5+ invalidações** por mutation. Com real-time, seriam **10+ invalidações** (mutation + evento).

**Solução:** 
- Local mutation: optimistic update APENAS, sem invalidate
- Real-time: centralizar invalidação no event processor
- Fallback: invalidate só se real-time desconectado

---

## 📊 Mapa de Compatibilidade Final

| Componente do Plano | Estado Atual | Ação Necessária |
|---------------------|--------------|-----------------|
| Query Keys | ✅ Org-scoped | Usar factory existente |
| Cache Tiers | ✅ REALTIME existe | Migrar hooks para usar |
| Smart Invalidate | ✅ Implementado | Usar diretamente |
| Supabase Client | ✅ Browser-ready | Usar `.channel()` |
| Audit Log Table | ⚠️ 90% pronto | Migration para sequence |
| INVALIDATION_MAP | ⚠️ Precisa orgId | Adaptar assinaturas |
| Optimistic Updates | ⚠️ Redundantes | Condicionar a RT status |
| Event Processor | ❌ Não existe | Implementar do zero |
| Connection Manager | ❌ Não existe | Implementar do zero |
| Offline Sync | ❌ Não existe | Implementar do zero |

---

## 🎯 Recomendações de Implementação

### Ordem de Prioridade

1. **[P0] Padronizar Cache Config**
   - Todos os hooks devem usar `CACHE_TIMES`
   - Zero hardcoded values
   - Estimativa: 2h

2. **[P0] Migration entity_events**
   - Adicionar colunas faltantes OU criar nova tabela
   - Estimativa: 1h

3. **[P1] Implementar Connection Manager**
   - Seguir plano (exponential backoff, jitter)
   - Singleton por org
   - Estimativa: 4h

4. **[P1] Implementar Event Processor**
   - Debounce 300ms
   - Usar helpers existentes
   - Estimativa: 4h

5. **[P2] Adaptar Mutation Hooks**
   - Condicionar invalidation a RT status
   - Manter optimistic updates
   - Estimativa: 3h

6. **[P2] Implementar UI Feedback**
   - Pulse indicator
   - Toast de atividade
   - Estimativa: 2h

7. **[P3] Offline Support**
   - localStorage sync state
   - Catch-up query
   - Estimativa: 6h

**Total estimado:** ~22h de desenvolvimento

---

## ✅ Conclusão

O plano de arquitetura enterprise é **sólido e compatível** com o projeto atual. Os principais ajustes são:

1. **Usar factories existentes** (`queryKeys.*`) ao invés de arrays manuais
2. **Adicionar orgId** em todas as funções do INVALIDATION_MAP
3. **Condicionar invalidações** ao status do real-time
4. **Pequena migration** para adicionar campos ao audit_logs

O projeto está bem preparado para receber real-time devido a:
- ✅ Query keys já org-scoped
- ✅ Helpers de invalidação já implementados
- ✅ Optimistic updates já existem
- ✅ Audit log já captura eventos

**Próximo passo sugerido:** Criar POC com 1 canal + 1 tipo de evento para validar end-to-end.

---

## 📎 Arquivos Auditados

- [query-keys.ts](src/lib/query/query-keys.ts) - Factory de query keys
- [cache-config.ts](src/lib/query/cache-config.ts) - Tiers de cache
- [helpers.ts](src/lib/query/helpers.ts) - Smart invalidation
- [use-tasks.ts](src/lib/query/hooks/use-tasks.ts) - Hook de tasks
- [use-features.ts](src/lib/query/hooks/use-features.ts) - Hook de features
- [client.ts](src/lib/supabase/client.ts) - Supabase browser client
- [schema.prisma](prisma/schema.prisma) - Database schema
- [activity/route.ts](src/app/api/dashboard/activity/route.ts) - Activity endpoint

