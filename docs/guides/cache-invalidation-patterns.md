# 📚 Guia de Cache e Invalidação - React Query

> **Versão:** 2.0  
> **Atualizado:** Janeiro 2026  
> **Status:** Padrão Oficial do Projeto

---

## 🎯 Objetivo

Este documento estabelece os **padrões obrigatórios** para gerenciamento de cache e invalidação no projeto. Seguir estas regras garante que a UI sempre reflita o estado atual dos dados.

---

## 🚀 TL;DR - Use os Helpers!

```typescript
import { smartInvalidate, smartInvalidateMany, invalidateDashboardQueries } from '@/lib/query/helpers';

// ✅ PREFERIDO - Use o helper
smartInvalidate(queryClient, queryKeys.tasks.lists());

// ✅ Múltiplas invalidações
smartInvalidateMany(queryClient, [
  queryKeys.tasks.lists(),
  queryKeys.features.detail(featureId),
]);

// ✅ Dashboard (após criar/atualizar/deletar tasks)
invalidateDashboardQueries(queryClient);
```

---

## 🔴 REGRAS DE OURO

### 1. Toda Mutation DEVE usar `refetchType: 'active'`

```typescript
// ✅ CORRETO - Usando helper (preferido)
smartInvalidate(queryClient, queryKeys.tasks.lists());

// ✅ CORRETO - Manualmente
queryClient.invalidateQueries({ 
  queryKey: queryKeys.tasks.lists(),
  refetchType: 'active'  // OBRIGATÓRIO!
});

// ❌ ERRADO - NUNCA faça isso
queryClient.invalidateQueries({ 
  queryKey: queryKeys.tasks.lists()
  // Sem refetchType = UI pode não atualizar!
});

// ❌ ERRADO - NUNCA use refetchQueries sem type
queryClient.refetchQueries({ queryKey: queryKeys.tasks.lists() });
```

### 2. Dados Mutáveis = Cache Curto ou Zero

```typescript
// Para dados que mudam frequentemente (tasks, comments):
staleTime: 5_000,  // 5 segundos máximo
gcTime: 5 * 60 * 1000,  // 5 minutos

// Para dados estáticos (configurações, enums):
staleTime: 10 * 60 * 1000,  // 10 minutos OK
```

### 3. API Routes com Mutations = Sem Cache HTTP

```typescript
// ✅ Para GET de dados mutáveis:
return jsonSuccess(result, { cache: 'none' });

// ✅ Para GET de dados estáticos:
return jsonSuccess(result, { cache: 'medium' });

// ❌ NUNCA use cache HTTP em endpoints de tasks/comments
return jsonSuccess(result, { cache: 'brief' }); // PROIBIDO!
```

---

## 🛠️ Helpers Disponíveis (`@/lib/query/helpers`)

| Helper | Uso |
|--------|-----|
| `smartInvalidate(qc, key)` | Invalidar uma query |
| `smartInvalidateMany(qc, [keys])` | Invalidar múltiplas queries |
| `invalidateDashboardQueries(qc)` | Invalidar dashboard (myTasks, activity, projects) |
| `invalidateTaskQueries(qc, featureId?)` | Invalidar tasks + dashboard + feature |
| `invalidateEpicQueries(qc, projectId?)` | Invalidar epics + project |
| `invalidateFeatureQueries(qc, epicId?)` | Invalidar features + epic |

---

## 📋 Padrões por Tipo de Operação

### CREATE - Criar Entidade

```typescript
export function useCreate<Entity>() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: create<Entity>,
    
    // OPÇÃO A: Optimistic Update (preferido para UX instantânea)
    onMutate: async (newData) => {
      // 1. Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: queryKeys.entity.lists() });
      
      // 2. Snapshot para rollback
      const previousData = queryClient.getQueryData(queryKeys.entity.lists());
      
      // 3. Optimistic update com ID temporário
      const tempEntity = {
        ...newData,
        id: `temp-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      
      queryClient.setQueryData(queryKeys.entity.lists(), (old) => 
        old ? [...old, tempEntity] : [tempEntity]
      );
      
      return { previousData, tempId: tempEntity.id };
    },
    
    onSuccess: (realEntity, _, context) => {
      // Substituir entidade temporária pela real
      queryClient.setQueryData(queryKeys.entity.lists(), (old) =>
        old?.map(item => item.id === context?.tempId ? realEntity : item)
      );
      
      // Invalidar para garantir consistência
      smartInvalidate(queryClient, queryKeys.entity.lists());
      
      toast.success('Criado com sucesso!');
    },
    
    onError: (_, __, context) => {
      // Rollback
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.entity.lists(), context.previousData);
      }
      toast.error('Erro ao criar');
    },
  });
}
```

### UPDATE - Atualizar Entidade

```typescript
import { smartInvalidate } from '@/lib/query/helpers';

export function useUpdate<Entity>() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: update<Entity>,
    
    onSuccess: (updatedEntity, variables) => {
      // 1. Atualizar no cache imediatamente
      queryClient.setQueryData(
        queryKeys.entity.detail(variables.id),
        updatedEntity
      );
      
      // 2. Atualizar em listas
      queryClient.setQueriesData(
        { queryKey: queryKeys.entity.lists() },
        (old) => old?.map(item => 
          item.id === updatedEntity.id ? updatedEntity : item
        )
      );
      
      // 3. Invalidar com refetch forçado (USAR HELPER!)
      smartInvalidate(queryClient, queryKeys.entity.lists());
      
      // 4. Invalidar entidades relacionadas se necessário
      if (updatedEntity.parentId) {
        smartInvalidate(queryClient, queryKeys.parent.detail(updatedEntity.parentId));
      }
      
      toast.success('Atualizado com sucesso!');
    },
    
    onError: () => {
      toast.error('Erro ao atualizar');
    },
  });
}
```

### DELETE - Excluir Entidade

```typescript
import { smartInvalidate } from '@/lib/query/helpers';

export function useDelete<Entity>() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEntity,
    
    // Optimistic delete
    onMutate: async (entityId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.entity.lists() });
      
      const previousData = queryClient.getQueryData(queryKeys.entity.lists());
      
      // Remover otimisticamente
      queryClient.setQueryData(queryKeys.entity.lists(), (old) =>
        old?.filter(item => item.id !== entityId)
      );
      
      return { previousData, entityId };
    },
    
    onSuccess: (_, entityId) => {
      // Remover query de detalhe
      queryClient.removeQueries({ 
        queryKey: queryKeys.entity.detail(entityId) 
      });
      
      // Forçar refetch das listas (USAR HELPER!)
      smartInvalidate(queryClient, queryKeys.entity.lists());
      
      toast.success('Excluído com sucesso!');
    },
    
    onError: (_, __, context) => {
      // Rollback
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.entity.lists(), context.previousData);
      }
      toast.error('Erro ao excluir');
    },
  });
}
```

### MOVE/REORDER - Operações de Drag & Drop

```typescript
export function useMove() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: moveEntity,
    
    // SEMPRE usar optimistic update para drag & drop
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() });
      
      const previousTasks = queryClient.getQueriesData({ 
        queryKey: queryKeys.tasks.lists() 
      });
      
      // Update otimista
      queryClient.setQueriesData(
        { queryKey: queryKeys.tasks.lists() },
        (old) => old ? {
          ...old,
          items: old.items.map(task =>
            task.id === id ? { ...task, status: newStatus } : task
          ),
        } : old
      );
      
      return { previousTasks };
    },
    
    onError: (_, __, context) => {
      // Rollback completo
      context?.previousTasks.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error('Erro ao mover');
    },
    
    onSettled: () => {
      // SEMPRE invalidar no final para garantir sync (USAR HELPER!)
      smartInvalidate(queryClient, queryKeys.tasks.lists());
    },
  });
}
```

---

## 📊 Configuração de Cache por Tipo de Dado

### Tier: REALTIME (0s stale)
Use para dados que precisam estar sempre atualizados:
- Notificações
- Votos de poker
- Chat/mensagens

```typescript
useQuery({
  queryKey: queryKeys.notifications.list(),
  queryFn: fetchNotifications,
  staleTime: 0,
  gcTime: 60_000,
  refetchInterval: 30_000, // Polling opcional
});
```

### Tier: FRESH (5s stale)
Use para dados frequentemente alterados:
- Tasks
- Comments
- Dashboard

```typescript
useQuery({
  queryKey: queryKeys.tasks.list(filters),
  queryFn: () => fetchTasks(filters),
  staleTime: 5_000,
  gcTime: 5 * 60_000,
});
```

### Tier: STANDARD (30s stale)
Use para dados que mudam moderadamente:
- Projetos
- Epics
- Features
- Usuários

```typescript
useQuery({
  queryKey: queryKeys.projects.list(),
  queryFn: fetchProjects,
  staleTime: 30_000,
  gcTime: 10 * 60_000,
});
```

### Tier: STABLE (10min stale)
Use para dados raramente alterados:
- Configurações da org
- Perfil do usuário

```typescript
useQuery({
  queryKey: queryKeys.settings.org(),
  queryFn: fetchOrgSettings,
  staleTime: 10 * 60_000,
  gcTime: 30 * 60_000,
});
```

### Tier: STATIC (1h stale)
Use para dados que quase nunca mudam:
- Enums
- Configurações estáticas

```typescript
useQuery({
  queryKey: queryKeys.enums.priorities(),
  queryFn: fetchPriorities,
  staleTime: 60 * 60_000,
  gcTime: 24 * 60 * 60_000,
});
```

---

## 🔗 Invalidação de Entidades Relacionadas

Quando uma entidade é alterada, outras entidades relacionadas podem precisar de invalidação:

```typescript
// Mapa de dependências
const INVALIDATION_MAP = {
  task: [
    'tasks.lists',
    'features.detail',      // Contadores
    'dashboard.myTasks',
    'dashboard.activity',
  ],
  feature: [
    'features.lists',
    'epics.detail',         // Contadores
    'tasks.list',           // Tasks podem depender de feature.status
  ],
  epic: [
    'epics.lists',
    'projects.detail',      // Contadores
    'features.list',
  ],
  project: [
    'projects.lists',
    'epics.list',
    'dashboard.activeProjects',
  ],
};
```

### Helper para Invalidação em Cascata

```typescript
// ✅ AGORA USE OS HELPERS PRONTOS! São mais simples:

import { 
  smartInvalidate, 
  smartInvalidateMany,
  invalidateTaskQueries, 
  invalidateEpicQueries,
  invalidateFeatureQueries 
} from '@/lib/query/helpers';

// Para tasks:
invalidateTaskQueries(queryClient, featureId);

// Para features:
invalidateFeatureQueries(queryClient, epicId);

// Para epics:
invalidateEpicQueries(queryClient, projectId);

// Para múltiplas queries customizadas:
smartInvalidateMany(queryClient, [
  queryKeys.tasks.lists(),
  queryKeys.dashboard.myTasks(),
]);
```

---

## ⚠️ Armadilhas Comuns

### 1. Esquecer `refetchType: 'active'` ou não usar helper

```typescript
// ❌ ERRADO - Pode não refetchar
queryClient.invalidateQueries({ queryKey });

// ⚠️ FUNCIONA, mas verboso
queryClient.invalidateQueries({ queryKey, refetchType: 'active' });

// ✅ PREFERIDO - Usa helper
smartInvalidate(queryClient, queryKey);
```

### 2. Usar refetchQueries sem type

```typescript
// ❌ ERRADO - Refetch todas as queries (muito pesado)
queryClient.refetchQueries({ queryKey: queryKeys.tasks.lists() });

// ✅ CORRETO - Invalidar com helper
smartInvalidate(queryClient, queryKeys.tasks.lists());
```

### 3. Cache HTTP + React Query

```typescript
// ❌ ERRADO - Cache HTTP conflita com React Query
return jsonSuccess(data, { cache: 'brief' });

// ✅ CORRETO para dados mutáveis
return jsonSuccess(data, { cache: 'none' });
```

### 3. Optimistic Update Sem Rollback

```typescript
// ❌ ERRADO - Sem rollback
onMutate: async (data) => {
  queryClient.setQueryData(key, newData);
  // E se der erro? UI fica inconsistente!
},

// ✅ CORRETO - Com rollback
onMutate: async (data) => {
  const previous = queryClient.getQueryData(key);
  queryClient.setQueryData(key, newData);
  return { previous };
},
onError: (_, __, context) => {
  queryClient.setQueryData(key, context.previous);
},
```

### 4. Invalidar Query Errada

```typescript
// ❌ ERRADO - Query key incompleta
queryClient.invalidateQueries({ queryKey: ['tasks'] });

// ✅ CORRETO - Usar factory + helper
smartInvalidate(queryClient, queryKeys.tasks.lists());
```

### 5. staleTime > Cache HTTP maxAge

```typescript
// ❌ ERRADO - React Query acha que dados são frescos,
// mas HTTP cache já expirou e vai buscar dados antigos
staleTime: 60_000  // 60s
// API: cache: 'brief'  // 10s

// ✅ CORRETO - staleTime <= maxAge HTTP ou cache: 'none'
staleTime: 5_000  // 5s
// API: cache: 'none'
```

---

## 🧪 Testando Invalidação

### Checklist para Testar Mutations

1. [ ] Criar entidade → aparece imediatamente na lista?
2. [ ] Editar entidade → atualiza imediatamente?
3. [ ] Deletar entidade → some imediatamente?
4. [ ] Mover (drag & drop) → movimento é instantâneo?
5. [ ] Após erro → rollback funciona?
6. [ ] Em outra aba → atualiza ao focar?
7. [ ] Dashboard → reflete mudanças?

### DevTools

Use o React Query DevTools para verificar:
- Quais queries estão stale
- Se invalidação está sendo chamada
- Se refetch está acontecendo

---

## 📝 Checklist para Code Review

Antes de aprovar PR com mutations, verificar:

- [ ] Usa `smartInvalidate` ou equivalente (com `refetchType: 'active'`)
- [ ] NÃO usa `refetchQueries` sem type
- [ ] staleTime apropriado para o tipo de dado
- [ ] API route não tem cache HTTP para dados mutáveis
- [ ] Optimistic update tem rollback no `onError`
- [ ] Entidades relacionadas são invalidadas
- [ ] Toast de feedback para usuário
- [ ] Tratamento de erro com `onError`

---

## 🔧 Implementação dos Helpers

Para referência, aqui está a implementação completa dos helpers em `@/lib/query/helpers`:

```typescript
import type { InvalidateQueryFilters, QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/**
 * Invalida uma query forçando refetch imediato para queries ativas.
 * SEMPRE use este helper ao invés de queryClient.invalidateQueries direto.
 */
export function smartInvalidate(
  queryClient: QueryClient, 
  queryKey: InvalidateQueryFilters['queryKey']
) {
  queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
}

/**
 * Invalida múltiplas queries de uma vez.
 */
export function smartInvalidateMany(
  queryClient: QueryClient, 
  queryKeys: InvalidateQueryFilters['queryKey'][]
) {
  queryKeys.forEach(queryKey => smartInvalidate(queryClient, queryKey));
}

/**
 * Invalida queries do dashboard (myTasks, activity, projects)
 */
export function invalidateDashboardQueries(queryClient: QueryClient) {
  smartInvalidateMany(queryClient, [
    queryKeys.dashboard.myTasks(),
    queryKeys.dashboard.recentActivity(),
    queryKeys.projects.list(),
  ]);
}

/**
 * Invalida tasks + dashboard + feature específica
 */
export function invalidateTaskQueries(queryClient: QueryClient, featureId?: string) {
  smartInvalidateMany(queryClient, [
    queryKeys.tasks.lists(),
    queryKeys.dashboard.myTasks(),
    queryKeys.dashboard.recentActivity(),
  ]);
  
  if (featureId) {
    smartInvalidate(queryClient, queryKeys.features.detail(featureId));
  }
}

/**
 * Invalida epics + project específico
 */
export function invalidateEpicQueries(queryClient: QueryClient, projectId?: string) {
  smartInvalidateMany(queryClient, [
    queryKeys.epics.lists(),
    queryKeys.epics.allList(),
  ]);
  
  if (projectId) {
    smartInvalidate(queryClient, queryKeys.projects.detail(projectId));
  }
}

/**
 * Invalida features + epic específico
 */
export function invalidateFeatureQueries(queryClient: QueryClient, epicId?: string) {
  smartInvalidateMany(queryClient, [
    queryKeys.features.lists(),
    queryKeys.features.allList(),
  ]);
  
  if (epicId) {
    smartInvalidate(queryClient, queryKeys.epics.detail(epicId));
  }
}
```
