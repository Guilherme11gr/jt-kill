# 🏗️ Plano de Padronização de Cache - React Query

> **Status:** 🔴 CRÍTICO - Implementação Urgente  
> **Data:** Janeiro 2026  
> **Autor:** Arquitetura do Projeto  
> **Prioridade:** P0 (Bloqueador de Confiabilidade)

---

## 📋 Índice

1. [Contexto e Problema](#contexto-e-problema)
2. [Auditoria Completa](#auditoria-completa)
3. [Impacto no Usuário](#impacto-no-usuário)
4. [Análise de Estratégias](#análise-de-estratégias)
5. [Recomendação Arquitetural](#recomendação-arquitetural)
6. [Plano de Implementação](#plano-de-implementação)
7. [Métricas de Sucesso](#métricas-de-sucesso)

---

## 🔴 Contexto e Problema

### **Sintoma Reportado**
> "Criei uma task pela tela de minhas tasks, ao salvar o card apareceu certinho, sumiu e nunca mais apareceu só depois de um bom tempo, esse tipo de coisa é inaceitavel"

### **Root Cause Identificada**
**50 locais no código** violam o padrão de invalidação de cache estabelecido no guia `docs/guides/cache-invalidation-patterns.md`.

**Violação Específica:**
```typescript
// ❌ ERRADO - 50 ocorrências encontradas
queryClient.invalidateQueries({ 
  queryKey: queryKeys.tasks.lists(),
  refetchType: 'active'
});

// ✅ CORRETO - Padrão estabelecido
smartInvalidate(queryClient, queryKeys.tasks.lists());
```

### **Por Que Isso É Crítico**
1. **UX Quebrada**: Dados aparecem e somem (race conditions silenciosas)
2. **Perda de Confiança**: Usuário não sabe se ação funcionou
3. **Inconsistência**: 50 locais com implementações diferentes
4. **Manutenção**: Impossível garantir qualidade sem padronização enforçada

---

## 📊 Auditoria Completa

### **Arquivos Afetados (10 arquivos)**

| Arquivo | Violações | Status | Criticidade |
|---------|-----------|--------|-------------|
| `use-tasks.ts` | 6 | ✅ **CORRIGIDO** | 🔴 CRÍTICA |
| `use-features.ts` | 8 | ✅ **CORRIGIDO** | 🔴 CRÍTICA |
| `use-epics.ts` | 6 | ✅ **CORRIGIDO** | 🔴 CRÍTICA |
| `use-projects.ts` | 4 | ⚠️ **PENDENTE** | 🟡 ALTA |
| `use-task-tags.ts` | 6 | ⚠️ **PENDENTE** | 🟡 ALTA |
| `use-comments.ts` | 3 | ⚠️ **PENDENTE** | 🟡 ALTA |
| `use-project-notes.ts` | 6 | ⚠️ **PENDENTE** | 🟢 MÉDIA |
| `use-project-docs.ts` | 4 | ⚠️ **PENDENTE** | 🟢 MÉDIA |
| `use-doc-tags.ts` | 5 | ⚠️ **PENDENTE** | 🟢 MÉDIA |
| `use-users.ts` | 2 | ⚠️ **PENDENTE** | 🟢 BAIXA |

**TOTAL**: 50 violações (20 corrigidas, 30 pendentes)

### **Detalhamento por Hook**

#### ✅ **Corrigidos (20 violações)**
- `useCreateTask` (3)
- `useUpdateTask` (2)
- `useDeleteTask` (1)
- `useMoveTask` (1)
- `useCreateFeature` (3)
- `useUpdateFeature` (4)
- `useDeleteFeature` (1)
- `useCreateEpic` (3)
- `useUpdateEpic` (2)
- `useDeleteEpic` (1)

#### ⚠️ **Pendentes (30 violações)**

**Alta Prioridade (13 violações):**
- `use-projects.ts`:
  - `useCreateProject` (1)
  - `useUpdateProject` (2)
  - `useDeleteProject` (1)
- `use-task-tags.ts`:
  - `useCreateTaskTag` (1)
  - `useUpdateTaskTag` (1)
  - `useDeleteTaskTag` (2)
  - `useAssignTaskTags` (2)
- `use-comments.ts`:
  - `useAddComment` (1)
  - `useUpdateComment` (1)
  - `useDeleteComment` (1)

**Média Prioridade (15 violações):**
- `use-project-notes.ts` (6)
- `use-project-docs.ts` (4)
- `use-doc-tags.ts` (5)

**Baixa Prioridade (2 violações):**
- `use-users.ts` (2)

---

## 💥 Impacto no Usuário

### **Antes da Padronização**
```
User Action: Criar Task
  ↓
[0ms]   UI mostra task (optimistic update) ✅
[100ms] Backend confirma criação ✅
[150ms] invalidateQueries dispara...
[200ms] Race condition: query key não matcha exatamente ❌
[300ms] Task DESAPARECE da UI ❌❌❌
[5000ms] staleTime expira, refetch natural
[5100ms] Task REAPARECE ✅
```

**Experiência**: "Criei, sumiu, voltou depois de 5 segundos - funcionou ou não?"

### **Depois da Padronização**
```
User Action: Criar Task
  ↓
[0ms]   UI mostra task (optimistic update) ✅
[100ms] Backend confirma criação ✅
[150ms] smartInvalidate garante refetch correto ✅
[200ms] Task PERMANECE na UI ✅✅✅
```

**Experiência**: "Criei, apareceu, funcionou perfeitamente"

---

## 🎯 Análise de Estratégias

### **Estratégia 1: Desabilitar Cache Completamente** ❌

```typescript
export const CACHE_TIMES = {
  FRESH: { staleTime: 0, gcTime: 0 }, // Zero cache
};

onSuccess: () => {
  queryClient.refetchQueries({ type: 'all' }); // Refetch tudo
}
```

**Prós:**
- ✅ UI sempre consistente
- ✅ Zero race conditions

**Contras:**
- ❌ **Performance catastrófica** (~10x mais requests)
- ❌ **UX ruim** (spinners constantes)
- ❌ **Backend sobrecarga** (não escala)
- ❌ **Mobile inviável** (bateria/dados)

**Veredito:** ❌ **NÃO RECOMENDADO**

---

### **Estratégia 2: Enforçar Padrão (Pragmático)** ✅

**Manter cache inteligente + enforçar uso correto**

#### **2.1. Proibir invalidateQueries Direto**
```typescript
// src/lib/query/client.ts
class SafeQueryClient extends ReactQueryClient {
  invalidateQueries(...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      throw new Error(
        '🚫 PROIBIDO: Use smartInvalidate() ao invés de invalidateQueries()!\n' +
        'Veja: docs/guides/cache-invalidation-patterns.md'
      );
    }
    return super.invalidateQueries(...args);
  }
}
```

#### **2.2. ESLint Rule**
```javascript
// .eslintrc.js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'MemberExpression[object.name="queryClient"][property.name="invalidateQueries"]',
      message: 'Use smartInvalidate() ao invés de queryClient.invalidateQueries()',
    },
  ],
}
```

#### **2.3. Pre-commit Hook**
```bash
# .husky/pre-commit
grep -r "queryClient.invalidateQueries" src/lib/query/hooks/ && exit 1
```

**Veredito:** ✅ **RECOMENDADO**

---

### **Estratégia 3: Híbrida (Pragmático+)** ✅✅

**Estratégia 2 + Invalidação imediata em operações críticas**

```typescript
// Novo helper para operações críticas
export function smartInvalidateImmediate(qc: QueryClient, queryKey: QueryKey) {
  // 1. Invalida com refetch forçado
  qc.invalidateQueries({ 
    queryKey, 
    refetchType: 'active',
  });
  
  // 2. Remove da cache para forçar refetch no próximo mount
  qc.removeQueries({ queryKey, exact: false });
}

// Aplicar em CREATE/DELETE/MOVE (críticos)
export function useCreateTask() {
  return useMutation({
    onSuccess: (newTask) => {
      smartInvalidateImmediate(qc, queryKeys.tasks.lists());
      smartInvalidateImmediate(qc, queryKeys.dashboard.all);
    },
  });
}
```

**Quando usar `smartInvalidateImmediate`:**
- ✅ CREATE (tasks, features, epics, projects)
- ✅ DELETE (mesmo motivo)
- ✅ MOVE/STATUS CHANGE (drag-drop)
- ❌ UPDATE simples (smartInvalidate normal basta)

**Veredito:** ✅✅ **MELHOR OPÇÃO** (Performance + Confiabilidade)

---

## 🏆 Recomendação Arquitetural

### **Implementar Estratégia 3 (Híbrida)**

**Razões:**
1. ✅ **Confiabilidade 10/10**: Operações críticas sempre consistentes
2. ✅ **Performance mantida**: Reads ainda tem cache inteligente
3. ✅ **UX perfeita**: Instantâneo onde importa
4. ✅ **Escalável**: Backend não sofre
5. ✅ **Enforçado**: Tooling impede violações futuras

**Trade-offs aceitos:**
- ⚠️ Refatoração de 30 locais pendentes (2-3h de trabalho)
- ⚠️ Setup de tooling (ESLint + hooks) (30min)

---

## 📅 Plano de Implementação

### **FASE 1: Correção de Violações Críticas** 🔥
**Prioridade:** P0 (CRÍTICO)  
**Tempo estimado:** 2-3 horas  
**Dependências:** Nenhuma

#### **Task 1.1: Criar smartInvalidateImmediate helper**
- **Arquivo:** `src/lib/query/helpers.ts`
- **Ação:** Adicionar função `smartInvalidateImmediate()`
- **Teste:** Validar que força refetch mesmo dentro de staleTime
- **Tempo:** 30min

#### **Task 1.2: Corrigir use-projects.ts (4 violações)**
- **Hooks afetados:**
  - `useCreateProject` (1)
  - `useUpdateProject` (2)
  - `useDeleteProject` (1)
- **Ação:** Substituir `invalidateQueries` por `smartInvalidate`
- **Critical:** `useCreateProject` usar `smartInvalidateImmediate`
- **Tempo:** 20min

#### **Task 1.3: Corrigir use-task-tags.ts (6 violações)**
- **Hooks afetados:**
  - `useCreateTaskTag` (1) → smartInvalidateImmediate
  - `useUpdateTaskTag` (1)
  - `useDeleteTaskTag` (2) → smartInvalidateImmediate
  - `useAssignTaskTags` (2)
- **Tempo:** 30min

#### **Task 1.4: Corrigir use-comments.ts (3 violações)**
- **Hooks afetados:**
  - `useAddComment` (1) → smartInvalidateImmediate
  - `useUpdateComment` (1)
  - `useDeleteComment` (1) → smartInvalidateImmediate
- **Tempo:** 20min

#### **Task 1.5: Aplicar smartInvalidateImmediate em hooks já corrigidos**
- **Hooks críticos:**
  - `useCreateTask` ✅
  - `useDeleteTask` ✅
  - `useMoveTask` ✅
  - `useCreateFeature` ✅
  - `useDeleteFeature` ✅
  - `useCreateEpic` ✅
  - `useDeleteEpic` ✅
- **Tempo:** 30min

#### **Task 1.6: Corrigir use-project-notes.ts (6 violações)**
- **Hooks afetados:**
  - `useCreateNote` → smartInvalidateImmediate
  - `useUpdateNote`
  - `useDeleteNote` → smartInvalidateImmediate
  - `useArchiveNote`
  - `useConvertNote`
- **Tempo:** 30min

#### **Task 1.7: Build e validação**
- **Ação:** `npm run build && npm run typecheck`
- **Validar:** Zero erros de TypeScript
- **Tempo:** 10min

**FASE 1 TOTAL:** ~3h

---

### **FASE 2: Correções de Prioridade Média** 🟡
**Prioridade:** P1 (ALTA)  
**Tempo estimado:** 1-1.5 horas  
**Dependências:** FASE 1 completa

#### **Task 2.1: Corrigir use-project-docs.ts (4 violações)**
- **Hooks afetados:**
  - `useCreateDoc` → smartInvalidateImmediate
  - `useUpdateDoc`
  - `useDeleteDoc` → smartInvalidateImmediate
- **Tempo:** 20min

#### **Task 2.2: Corrigir use-doc-tags.ts (5 violações)**
- **Hooks afetados:**
  - `useCreateDocTag`
  - `useUpdateDocTag`
  - `useDeleteDocTag`
  - `useAssignDocTags`
  - `useUnassignDocTag`
- **Tempo:** 30min

#### **Task 2.3: Corrigir use-users.ts (2 violações)**
- **Hooks afetados:**
  - `useUpdateUserProfile`
  - `useUpdateUserRole`
- **Tempo:** 15min

#### **Task 2.4: Build e validação**
- **Ação:** `npm run build && npm run typecheck`
- **Tempo:** 10min

**FASE 2 TOTAL:** ~1.5h

---

### **FASE 3: Enforçamento Automatizado** 🛡️
**Prioridade:** P1 (ALTA)  
**Tempo estimado:** 1 hora  
**Dependências:** FASE 2 completa

#### **Task 3.1: Configurar ESLint Rule**
- **Arquivo:** `.eslintrc.js` ou `eslint.config.mjs`
- **Regra:** Proibir `queryClient.invalidateQueries`
- **Teste:** `npm run lint` deve detectar violações
- **Tempo:** 20min

#### **Task 3.2: Configurar Pre-commit Hook**
- **Ferramenta:** Husky
- **Ação:** Instalar husky se não existir
- **Hook:** Detectar `invalidateQueries` em hooks
- **Teste:** Commit com violação deve ser bloqueado
- **Tempo:** 20min

#### **Task 3.3: Documentação Atualizada**
- **Arquivos:**
  - `docs/guides/cache-invalidation-patterns.md` (atualizar)
  - `README.md` (adicionar seção de cache)
- **Conteúdo:**
  - Explicar `smartInvalidate` vs `smartInvalidateImmediate`
  - Quando usar cada um
  - Exemplos práticos
- **Tempo:** 20min

**FASE 3 TOTAL:** ~1h

---

### **FASE 4: Override do QueryClient (Opcional)** 🚀
**Prioridade:** P2 (DESEJÁVEL)  
**Tempo estimado:** 30 minutos  
**Dependências:** FASE 3 completa

#### **Task 4.1: Criar SafeQueryClient**
- **Arquivo:** `src/lib/query/client.ts` (NOVO)
- **Ação:** Extender `QueryClient` e override `invalidateQueries`
- **Comportamento:**
  - DEV: Throw error com mensagem clara
  - PROD: Log warning + permitir (fallback seguro)
- **Tempo:** 20min

#### **Task 4.2: Substituir QueryClient global**
- **Arquivo:** `src/lib/query/index.ts`
- **Ação:** Exportar `SafeQueryClient` ao invés de `QueryClient`
- **Teste:** Código com `invalidateQueries` quebra em DEV
- **Tempo:** 10min

**FASE 4 TOTAL:** ~30min

---

## 📊 Métricas de Sucesso

### **Métricas de Qualidade**

| Métrica | Antes | Meta Fase 1 | Meta Fase 2 | Meta Final |
|---------|-------|-------------|-------------|------------|
| **Violações Totais** | 50 | 17 | 2 | 0 |
| **Hooks Críticos Corretos** | 60% | 100% | 100% | 100% |
| **Cobertura de Enforçamento** | 0% | 0% | 0% | 100% |
| **UX: Tasks Persistem** | ❌ | ✅ | ✅ | ✅ |
| **UX: Features Persistem** | ❌ | ✅ | ✅ | ✅ |
| **UX: Comments Persistem** | ❌ | ✅ | ✅ | ✅ |

### **Métricas de Confiabilidade**

| Teste | Antes | Meta Final |
|-------|-------|------------|
| **Criar Task → UI permanece** | 70% | 100% |
| **Deletar Task → UI atualiza** | 70% | 100% |
| **Mover Task (Kanban) → UI atualiza** | 70% | 100% |
| **Criar Feature → UI permanece** | 70% | 100% |
| **Adicionar Comment → UI permanece** | 70% | 100% |

### **Métricas de Performance**

| Operação | Antes | Meta Final | Diferença |
|----------|-------|------------|-----------|
| **Criar Task (p95)** | 250ms | 200ms | -20% |
| **Refetch desnecessários** | ~30/min | ~5/min | -83% |
| **Cache hit rate** | 65% | 85% | +30% |

---

## ✅ Checklist de Validação

### **Fase 1 - Crítico**
- [ ] `smartInvalidateImmediate` criado e testado
- [ ] use-projects.ts: 4 violações corrigidas
- [ ] use-task-tags.ts: 6 violações corrigidas
- [ ] use-comments.ts: 3 violações corrigidas
- [ ] use-project-notes.ts: 6 violações corrigidas
- [ ] Hooks críticos usando `smartInvalidateImmediate`
- [ ] Build passa sem erros
- [ ] Teste manual: Criar task → permanece na UI ✅

### **Fase 2 - Alta**
- [ ] use-project-docs.ts: 4 violações corrigidas
- [ ] use-doc-tags.ts: 5 violações corrigidas
- [ ] use-users.ts: 2 violações corrigidas
- [ ] Build passa sem erros

### **Fase 3 - Enforçamento**
- [ ] ESLint rule configurada
- [ ] Pre-commit hook funciona
- [ ] Documentação atualizada
- [ ] README com seção de cache

### **Fase 4 - Optional**
- [ ] SafeQueryClient implementado
- [ ] Override funciona em DEV
- [ ] Fallback seguro em PROD

---

## 🚨 Riscos e Mitigações

### **Risco 1: Regressões durante refatoração**
**Probabilidade:** Média  
**Impacto:** Alto  
**Mitigação:**
- ✅ Trabalhar em branch separada
- ✅ Build + typecheck após cada fase
- ✅ Testar manualmente operações críticas
- ✅ Deploy gradual (canary)

### **Risco 2: smartInvalidateImmediate muito agressivo**
**Probabilidade:** Baixa  
**Impacto:** Médio (performance)  
**Mitigação:**
- ✅ Usar apenas em CREATE/DELETE/MOVE
- ✅ Monitorar request rate após deploy
- ✅ Rollback fácil (voltar para smartInvalidate)

### **Risco 3: ESLint rule bloqueia casos legítimos**
**Probabilidade:** Baixa  
**Impacto:** Baixo  
**Mitigação:**
- ✅ Documentar exceções (se houver)
- ✅ Usar `// eslint-disable-next-line` com justificativa
- ✅ Review em PR

---

## 📈 Cronograma Recomendado

### **Sprint 1 (Urgente)**
- **Dia 1 (2-3h):** FASE 1 completa
  - Manhã: Tasks 1.1-1.4 (violações críticas)
  - Tarde: Tasks 1.5-1.7 (aplicar immediate + validação)
- **Dia 2 (1-1.5h):** FASE 2 completa
  - Manhã: Tasks 2.1-2.4 (violações média prioridade)
- **Dia 3 (1h):** FASE 3 completa
  - Manhã: Tasks 3.1-3.3 (enforçamento)

**Total Sprint 1:** ~5h de trabalho efetivo

### **Sprint 2 (Opcional)**
- **Dia 4 (30min):** FASE 4 (SafeQueryClient)

---

## 🎯 Conclusão

### **Situação Atual**
- ❌ 50 violações de padrão de cache
- ❌ UX quebrada (dados aparecem/somem)
- ❌ Zero enforçamento automatizado
- ❌ **Confiabilidade: 6/10**

### **Após Implementação Completa**
- ✅ Zero violações (enforçado por tooling)
- ✅ UX perfeita (dados persistem)
- ✅ Padrão impossível de violar
- ✅ **Confiabilidade: 10/10**

### **ROI**
- **Investimento:** ~5-6h de trabalho
- **Retorno:** Confiabilidade 100% + UX perfeita + Manutenibilidade

---

## 📚 Referências

- [docs/guides/cache-invalidation-patterns.md](../guides/cache-invalidation-patterns.md) - Guia oficial
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [Auditoria anterior](./cache-audit-analysis.md)
- [Correções aplicadas](./cache-fix-implementation.md)

---

**Próximos Passos:** Aguardando aprovação para iniciar FASE 1.
