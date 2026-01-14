# 🔧 Real-Time Fix - Broadcast Implementado

## 🔴 Problemas Identificados

### 1. **Broadcast nunca era chamado**
Os mutation hooks (useUpdateTask, useMoveTask, useUpdateFeature) **NÃO** estavam emitindo eventos broadcast.
- Resultado: Outros clientes nunca sabiam das mudanças
- Solução: Adicionar `broadcast()` em TODOS os onSuccess

### 2. **self: false no Connection Manager**
```typescript
broadcast: { self: false }, // ❌ Você nunca recebia seus próprios eventos
```
- Problema: Mesmo se broadcastasse, você não veria (só outros clientes)
- Solução: Mudado para `self: true` para cross-tab sync

### 3. **Faltava integração com hooks de auth**
- Problema: Não tinha acesso ao usuário para preencher `actorName` e `actorId`
- Solução: Importar `useAuth()` nos hooks de mutation

## ✅ Implementação

### 1. Connection Manager (`connection-manager.ts`)
```typescript
// ANTES
broadcast: { self: false }, // ❌

// DEPOIS
broadcast: { self: true }, // ✅ Recebe próprios eventos
```

### 2. Mutation Hooks (`use-tasks.ts`, `use-features.ts`)

**Padrão implementado:**
```typescript
export function useUpdateTask() {
  const broadcast = useRealtimeBroadcast(); // ✅ Hook de broadcast
  const { user } = useAuth(); // ✅ Dados do usuário
  const orgId = useCurrentOrgId(); // ✅ Multi-org

  return useMutation({
    mutationFn: updateTask,
    onSuccess: (updatedTask) => {
      // ✅ 1. BROADCAST SEMPRE (para outros clientes + cross-tab)
      broadcast({
        eventId: crypto.randomUUID(),
        orgId,
        entityType: 'task',
        entityId: updatedTask.id,
        projectId: updatedTask.feature?.epic?.project?.id || orgId,
        featureId: updatedTask.featureId || undefined,
        epicId: updatedTask.feature?.epic?.id || undefined,
        eventType: 'updated',
        actorType: 'user',
        actorName: user?.user_metadata?.full_name || 'Unknown',
        actorId: user?.id || 'system',
        timestamp: new Date().toISOString(),
      });

      // ✅ 2. Optimistic update local
      queryClient.setQueriesData<TasksResponse>(...);

      // ✅ 3. Invalidação apenas se RT desconectado
      if (!isRealtimeActive) {
        smartInvalidate(...);
      }
    },
  });
}
```

### 3. Hooks Modificados

✅ **useUpdateTask** - Broadcast ao atualizar task
✅ **useMoveTask** - Broadcast ao mover task (status_changed)
✅ **useUpdateFeature** - Broadcast ao atualizar feature

## 🧪 Como Testar

### 1. Abrir 2 abas no mesmo browser
```
Aba 1: /projects/abc/tasks
Aba 2: /projects/abc/tasks
```

### 2. Mover uma task na Aba 1
**Esperado:**
- Aba 1: Task move instantaneamente (optimistic update)
- Aba 2: Task move em ~300ms (broadcast + event processor)
- Console: `[Realtime Sync] Received event: { entityType: 'task', eventType: 'status_changed' }`

### 3. Abrir 2 contas diferentes (multi-org)
```
Browser 1: usuário A, org X
Browser 2: usuário B, org X (mesma org!)
```

**Esperado:**
- Usuário A move task
- Usuário B vê a task mover em tempo real
- Console: `[Realtime Sync] Processing batch of 1 events`

### 4. Verificar logs no console
```
✅ [RealtimeProvider] Manager created (apenas 1x)
✅ [RealtimeProvider] Connecting to org abc-123
✅ Connected
✅ Heartbeat started
✅ [Realtime Sync] Received event: {...}
✅ [Realtime Sync] Processing batch of 1 events, 5 keys
```

## 🎯 Fluxo Real-Time Completo

```
┌─────────────────────────────────────────────────────────────┐
│ Client A (muda task)                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. useMutation.mutate({ status: 'DOING' })                 │
│    ↓                                                        │
│ 2. API PATCH /api/tasks/123                                │
│    ↓                                                        │
│ 3. onSuccess(updatedTask)                                  │
│    ├─ broadcast({ eventType: 'status_changed' })           │
│    ├─ optimistic update (local cache)                      │
│    └─ skip invalidation (RT ativo)                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ Supabase Realtime (WebSocket)
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ Client B (recebe broadcast)                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. RealtimeProvider.onEvent(event)                         │
│    ↓                                                        │
│ 2. EventProcessor.processEvent(event)                      │
│    ├─ debounce 300ms                                       │
│    ├─ deduplicate by eventId                               │
│    └─ getInvalidationKeys(event)                           │
│        → [orgId, 'task', '123']                            │
│        → [orgId, 'tasks']                                  │
│        → [orgId, 'feature', 'abc']                         │
│    ↓                                                        │
│ 3. queryClient.invalidateQueries(keys)                     │
│    ↓                                                        │
│ 4. React Query refetch                                     │
│    ↓                                                        │
│ 5. UI re-renders com dados atualizados ✅                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Performance

### Antes (sem broadcast):
- ❌ Nenhum sync entre clientes
- ❌ Usuários precisam F5 para ver mudanças
- ❌ Cache stale indefinidamente

### Depois (com broadcast):
- ✅ Sync em ~300ms (debounce)
- ✅ Apenas 1 GoTrueClient por app
- ✅ Deduplicação automática de eventos
- ✅ Cross-tab sync (mesma conta, múltiplas abas)
- ✅ Multi-user sync (diferentes contas, mesma org)

## 🐛 Debug

### Se não funcionar:

1. **Verificar console**:
   ```
   ❌ [Realtime] Cannot broadcast: not connected
   ```
   → Verificar se RealtimeProvider está no layout.tsx

2. **Verificar logs de broadcast**:
   ```typescript
   // Adicionar no connection-manager.ts linha ~220
   console.log('[Realtime] Broadcasting event:', event);
   ```

3. **Verificar event processor**:
   ```typescript
   // Já tem logs em event-processor.ts
   [Realtime Sync] Received event: {...}
   [Realtime Sync] Processing batch of N events
   ```

4. **Verificar invalidação**:
   ```typescript
   // Em invalidation-map.ts
   console.log('[Invalidation] Keys:', keys);
   ```

## 🚀 Próximos Passos

1. ✅ Broadcast implementado em tasks e features
2. ⏳ Adicionar broadcast em epics
3. ⏳ Adicionar broadcast em comments
4. ⏳ Adicionar broadcast em docs
5. ⏳ Adicionar sequence generation no backend (migration)
6. ⏳ Testar em produção com múltiplos usuários

## 📚 Referências

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [TanStack Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations)
- [`docs/architecture/realtime-context-refactor.md`](docs/architecture/realtime-context-refactor.md)
