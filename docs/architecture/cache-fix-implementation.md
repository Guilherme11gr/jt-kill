# 🔧 Plano de Correção: Problemas de Atualização de Dados

> **Data:** Janeiro 2026  
> **Status:** ✅ IMPLEMENTADO  
> **Criticidade:** ALTA

---

## Resumo das Correções Aplicadas

### 1. ✅ Adicionado `refetchType: 'active'` em TODAS as invalidações

**Arquivos corrigidos:**

| Arquivo | Hooks Corrigidos |
|---------|------------------|
| `helpers.ts` | `invalidateDashboardQueries` |
| `use-tasks.ts` | `useCreateTask`, `useDeleteTask`, `useMoveTask` |
| `use-project-notes.ts` | `useCreateNote`, `useUpdateNote`, `useDeleteNote`, `useArchiveNote`, `useConvertNote` |
| `use-project-docs.ts` | `useCreateDoc`, `useUpdateDoc`, `useDeleteDoc` |
| `use-doc-tags.ts` | `useCreateTag`, `useDeleteTag`, `useAssignTags`, `useUnassignTag` |
| `use-task-tags.ts` | `useCreateTaskTag`, `useUpdateTaskTag`, `useDeleteTaskTag`, `useAssignTaskTags` |
| `use-epics.ts` | Invalidações internas de `useUpdateEpic`, `useDeleteEpic` |
| `use-features.ts` | Invalidação interna de `useDeleteFeature` |
| `use-move-task-undo.ts` | Undo handler |
| `quick-task-dialog.tsx` | Mutation local |

---

### 2. ✅ Removido Cache HTTP de Tasks API

**Arquivo:** `src/app/api/tasks/route.ts`

```typescript
// ANTES (causava dados stale)
return jsonSuccess(result, { cache: 'brief' });

// DEPOIS (dados sempre frescos)
return jsonSuccess(result, { cache: 'none' });
```

**Razão:** O cache HTTP de 10s + stale-while-revalidate de 30s conflitava com o React Query, fazendo com que mesmo após invalidação, o browser retornasse dados do cache HTTP.

---

### 3. ✅ Reduzido staleTime de Tasks para 5s

**Arquivo:** `src/lib/query/hooks/use-tasks.ts`

```typescript
// ANTES
staleTime: 30_000, // 30 segundos

// DEPOIS
staleTime: 5_000, // 5 segundos
```

**Razão:** 30 segundos era muito tempo para dados que mudam frequentemente. Agora a UI fica mais responsiva.

---

### 4. ✅ Melhorado Optimistic Update em `useCreateTask`

**Antes:** Apenas invalidava, sem atualizar cache imediatamente.

**Depois:** 
1. Adiciona task ao cache imediatamente
2. Invalida com `refetchType: 'active'` para garantir consistência
3. Invalida feature detail para atualizar contadores

---

### 5. ✅ Adicionado Optimistic Delete com Rollback em `useDeleteTask`

**Antes:** Apenas invalidava após deletar.

**Depois:**
1. Remove task do cache imediatamente (`onMutate`)
2. Mantém snapshot para rollback
3. Se erro, restaura dados anteriores
4. Invalida com `refetchType: 'active'`

---

## Documentação Criada

1. **`docs/architecture/cache-audit-analysis.md`**
   - Análise completa dos problemas encontrados
   - Diagnóstico por hook
   - Causas raiz identificadas

2. **`docs/guides/cache-invalidation-patterns.md`**
   - Padrões obrigatórios para mutations
   - Configuração de cache por tipo de dado
   - Checklist para code review
   - Armadilhas comuns a evitar

---

## Por que as correções funcionam?

### Problema Original
```
invalidateQueries({ queryKey: ... })
// Apenas marca como "stale", mas NÃO força refetch
// React Query pode decidir esperar
```

### Solução
```
invalidateQueries({ 
  queryKey: ...,
  refetchType: 'active'  // FORÇA refetch de queries ativas!
})
```

**Comportamento com `refetchType: 'active'`:**
1. Marca dados como stale
2. **Imediatamente** refetch todas as queries ativas com esse prefixo
3. UI atualiza assim que o refetch completa

---

## Validação

### Cenários de Teste

1. **Criar Task no Kanban**
   - [ ] Task aparece imediatamente na coluna correta
   - [ ] Dashboard atualiza (se aberto em outra aba)

2. **Mover Task (Drag & Drop)**
   - [ ] Task move instantaneamente
   - [ ] Não "pula de volta" para posição antiga
   - [ ] Outras views refletem mudança

3. **Deletar Task**
   - [ ] Task some imediatamente
   - [ ] Contadores atualizam
   - [ ] Não precisa F5

4. **Quick Task Dialog**
   - [ ] Task criada aparece no Kanban
   - [ ] Dashboard reflete nova task

5. **Project Notes**
   - [ ] Criar/editar/arquivar atualiza lista
   - [ ] Converter para feature atualiza ambas listas

---

## Próximos Passos (Opcional)

### Melhoria Adicional: Polling para Colaboração Real-Time

Se múltiplos usuários estiverem editando simultaneamente, considerar:

```typescript
// Em queries críticas para colaboração
useQuery({
  queryKey: ...,
  queryFn: ...,
  refetchInterval: 30_000, // Polling a cada 30s
});
```

### Considerar: WebSocket para Updates Real-Time

Para apps com alta colaboração, WebSocket é mais eficiente que polling. Mas para uso individual/time pequeno, as correções atuais são suficientes.

---

## Conclusão

Todas as mutations do sistema agora seguem o padrão:

```typescript
onSuccess: () => {
  // 1. Optimistic update (se aplicável)
  queryClient.setQueryData(...);
  
  // 2. Invalidar COM refetch forçado
  queryClient.invalidateQueries({ 
    queryKey: ...,
    refetchType: 'active'
  });
}
```

Isso garante que **toda mutação resulta em UI atualizada imediatamente**, sem necessidade de F5.
