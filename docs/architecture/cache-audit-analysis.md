# 🔍 Auditoria Completa: Sistema de Atualização de Dados

> **Data:** Janeiro 2026  
> **Status:** Análise concluída - Aguardando implementação  
> **Criticidade:** ALTA - Afeta usabilidade do sistema

---

## Resumo Executivo

Após análise profunda do código, identificamos **MÚLTIPLOS PROBLEMAS CRÍTICOS** que estão causando a lentidão/falha nas atualizações de UI. O sistema tem uma mistura inconsistente de estratégias de cache/invalidação que está gerando comportamento imprevisível.

**Causa raiz:** Combinação de:
1. `invalidateQueries` sem `refetchType: 'active'` em vários hooks
2. `staleTime` alto demais (30s) para dados frequentemente alterados
3. Cache HTTP conflitando com cache do React Query
4. Falta de sincronização entre diferentes query keys afetadas
5. Optimistic updates incompletos que dependem de invalidação posterior

---

## 1. 🔴 PROBLEMAS CRÍTICOS (MUST FIX)

### 1.1. Query Keys Inconsistentes - Race Condition de Invalidação

**Arquivo:** `src/lib/query/hooks/use-tasks.ts` (linhas 134-142)

```typescript
// PROBLEMA: Ao invalidar com queryKeys.tasks.lists(), 
// a query ativa usa queryKeys.tasks.list(resolvedFilters)
// Se os filtros mudaram durante a mutation, a invalidação pode não acertar a query correta!
```

**O que acontece:**
1. Usuário cria task com filtro `{ status: 'TODO' }`
2. Mutation executa `invalidateQueries({ queryKey: queryKeys.tasks.lists() })`
3. Mas a query key real é `['tasks', 'list', { status: 'TODO' }]`
4. O `lists()` retorna `['tasks', 'list']` - que é um **prefixo**, deveria funcionar...
5. **MAS** com `refetchType: 'active'`, só refetch queries ATIVAS. Se o usuário mudou de aba/filtro, a query antiga não é mais "ativa"

---

### 1.2. staleTime muito alto para Tasks (30s)

**Arquivo:** `src/lib/query/hooks/use-tasks.ts` (linhas 122-125)

```typescript
// Cache tasks for 30s to avoid refetch on filter toggle
staleTime: 30_000, // 30 segundos  ← PROBLEMA!
```

**Problema:** 
- Com `staleTime: 30_000`, mesmo após `invalidateQueries`, se os dados ainda estão no cache e não são considerados "stale", o React Query **não refetch imediatamente**.
- `invalidateQueries` marca como stale, mas NÃO força refetch se não houver observers ativos.

---

### 1.3. `refetchType: 'active'` Ausente na Maioria dos Hooks

**Arquivos:** Todos os hooks de mutation

```typescript
// PROBLEMA EM TODOS OS HOOKS:
queryClient.invalidateQueries({ 
  queryKey: queryKeys.tasks.lists(),
  // FALTA: refetchType: 'active'
});
```

**O que é "active"?**
- Uma query é "active" se tem observers (componentes usando ela)
- Sem `refetchType`, o React Query pode decidir não refetchar imediatamente
- Com `refetchType: 'active'`, força refetch de todas as queries ativas

---

### 1.4. Cache HTTP do Servidor Conflitando

**Arquivo:** `src/app/api/tasks/route.ts` (linhas 46-47)

```typescript
return jsonSuccess(result, { cache: 'brief' }); // 10s de cache HTTP!
```

**Problema:**
- Mesmo que React Query invalide o cache local, se o browser/CDN cacheou a resposta HTTP por 10s, a próxima request vai retornar dados stale!
- `stale-while-revalidate=30` piora isso - serve dados stale enquanto revalida em background

**Combinação mortal:**
```
React Query staleTime: 30s
+ HTTP Cache: 10s + 30s stale-while-revalidate
= Dados podem estar até 40 segundos desatualizados!
```

---

### 1.5. `invalidateDashboardQueries` Sem `refetchType`

**Arquivo:** `src/lib/query/helpers.ts`

```typescript
export function invalidateDashboardQueries(queryClient: QueryClient) {
  // ❌ PROBLEMA: Nenhuma dessas invalidações tem refetchType: 'active'
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.myTasks() });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.activity() });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.activeProjects() });
}
```

---

## 2. Tabela Resumo dos Problemas por Hook

| Hook | Problema | Refetch Imediato? | Sintoma |
|------|----------|-------------------|---------|
| `useCreateTask` | Sem refetchType | ❌ Não | Task demora a aparecer |
| `useMoveTask` | `onSettled` sem refetchType | ❌ Não | Task "pula" ou demora |
| `useDeleteTask` | Sem refetchType | ❌ Não | Task continua visível |
| `useUpdateTask` | Com refetchType: 'active' | ✅ Sim | OK |
| `useMoveTaskWithUndo` | Com refetchType: 'active' | ✅ Sim | OK |
| `QuickTaskDialog` | Sem refetchType | ❌ Não | Task não aparece |
| `invalidateDashboardQueries` | Sem refetchType | ❌ Não | Dashboard desatualizado |
| `useCreateProject` | Com refetchType: 'active' | ✅ Sim | OK |
| `useUpdateProject` | Com refetchType: 'active' | ✅ Sim | OK |
| `useDeleteProject` | Sem refetchType | ❌ Parcial | Pode demorar |
| `useCreateEpic` | Com refetchType: 'active' | ✅ Sim | OK |
| `useUpdateEpic` | Com refetchType: 'active' | ✅ Sim | OK |
| `useDeleteEpic` | Sem refetchType | ❌ Parcial | Pode demorar |
| `useCreateFeature` | Com refetchType: 'active' | ✅ Sim | OK |
| `useUpdateFeature` | Com refetchType: 'active' | ✅ Sim | OK |
| `useDeleteFeature` | Usa `refetchQueries` | ✅ Sim | OK |
| Project Notes hooks | Sem refetchType em vários | ❌ Parcial | Notas não atualizam |

---

## 3. 🟠 ALTO RISCO / Edge Cases

### 3.1. Optimistic Update Parcial em useCreateTask

**Arquivo:** `src/lib/query/hooks/use-tasks.ts`

```typescript
onSuccess: (newTask) => {
  // Não há optimistic update no cache ANTES de invalidar
  // Só invalida - depende 100% do refetch
  queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
```

**Problema:** 
- `useCreateTask` NÃO faz optimistic update
- Depende 100% da invalidação + refetch
- Se refetch demorar ou falhar, usuário não vê a task

**Contraste com useMoveTask:**
```typescript
// useMoveTask FAZ optimistic update corretamente:
onMutate: async ({ id, status }) => {
  await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() });
  // Snapshot e update otimista...
}
```

### 3.2. Deep Link + Modal + Cache = Bug de Estado

Se usuário edita task e ela sai do filtro atual (ex: muda status de TODO para DONE em view filtrada por TODO), após invalidação e refetch, `tasks.find()` não encontra mais a task, modal fecha abruptamente.

---

## 4. 🟡 Architecture / Code Smell

### 4.1. Mistura de Estratégias de Invalidação

O código usa 4 estratégias diferentes de forma inconsistente:

| Hook | Estratégia |
|------|------------|
| `useCreateTask` | Apenas `invalidateQueries` |
| `useUpdateTask` | `setQueriesData` + `invalidateQueries` |
| `useMoveTask` | Optimistic completo (`onMutate`) |
| `useDeleteTask` | Apenas `invalidateQueries` |
| `useDeleteFeature` | Optimistic + `refetchQueries` |

**Recomendação:** Padronizar em UMA estratégia consistente para todos os mutations.

---

## 5. Diagnóstico Final

### Por que funciona às vezes?
Quando o `staleTime` já expirou OU quando você foca na janela (`refetchOnWindowFocus: true`), o React Query refetch automaticamente. Por isso às vezes "funciona" após alguns segundos ou após alt-tab.

### Por que precisa de F5?
Se os dados ainda estão dentro do `staleTime` (30s para STANDARD, 5s para FRESH), o React Query considera os dados "frescos" e não refetch mesmo após invalidação a menos que você use `refetchType: 'active'` ou `refetchType: 'all'`.

---

## 6. 📋 Prioridade de Correção

| # | Item | Impacto | Esforço |
|---|------|---------|---------|
| 1 | Adicionar `refetchType: 'active'` em TODAS as invalidações | Alto | Baixo |
| 2 | Remover cache HTTP (`cache: 'none'`) em endpoints de tasks | Alto | Baixo |
| 3 | Reduzir `staleTime` para 5s em useTasks | Médio | Baixo |
| 4 | Adicionar optimistic update em `useCreateTask` | Alto | Médio |
| 5 | Padronizar estratégia em todos os hooks | Médio | Médio |
| 6 | Atualizar `invalidateDashboardQueries` com refetchType | Alto | Baixo |
| 7 | Criar documentação de padrões de cache | Médio | Baixo |

---

## 7. Arquivos que Precisam de Correção

1. `src/lib/query/hooks/use-tasks.ts`
2. `src/lib/query/hooks/use-projects.ts`
3. `src/lib/query/hooks/use-epics.ts`
4. `src/lib/query/hooks/use-features.ts`
5. `src/lib/query/hooks/use-comments.ts`
6. `src/lib/query/hooks/use-project-notes.ts`
7. `src/lib/query/helpers.ts`
8. `src/components/features/dashboard/quick-task-dialog.tsx`
9. `src/app/api/tasks/route.ts` (remover cache HTTP)
10. `src/hooks/use-block-task.ts`
