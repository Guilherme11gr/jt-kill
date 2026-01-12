## 💭 Discussão de Arquitetura: Real-time Strategy

Vou ser direto como senior pra senior:

---

### 🎯 Sua proposta de "ping system" está **100% correta**. É exatamente o padrão de mercado.

**Por quê:**

1. **Supabase Free Tier Realtime:**
   - 200 concurrent connections
   - 2GB data transfer/month
   - Payload full (~5KB/evento) vs Ping (~100 bytes) = **50x mais eficiente**

2. **Math real:**
   ```
   1000 updates/dia * 30 dias = 30k eventos/mês
   
   Payload full: 30k × 5KB = 150MB ❌ (mata o limite rápido)
   Ping system:  30k × 100 bytes = 3MB ✅ (sobra MUITO espaço)
   ```

3. **React Query já resolve o resto:**
   ```typescript
   // Cliente recebe ping
   supabase.channel('tasks')
     .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, 
       (payload) => {
         // Só precisa do ID!
         queryClient.invalidateQueries(['tasks', payload.new.id]);
         // React Query refetch automaticamente
       }
     );
   ```

---

### 🏗️ Arquitetura Recomendada: **Ping + Metadata Mínima**

```typescript
// Evento Supabase Realtime (apenas IDs e tipo)
{
  "event": "task.updated",
  "taskId": "uuid",
  "featureId": "uuid",
  "projectId": "uuid",
  "timestamp": "ISO"
}
```

**Fluxo:**
1. AI agent atualiza task → trigger Postgres
2. Supabase Realtime emite ping (100 bytes)
3. Cliente invalida cache React Query
4. React Query refetch em background (se a query estiver ativa)
5. UI atualiza suavemente

**Trade-off aceito:**
- +1 HTTP GET por update (~100-200ms latência)
- Mas usuário NEM PERCEBE se tiver optimistic update
- Economia de 98% no bandwidth

---

### 📊 Tela de Atividades de AI

**Minha opinião honesta:**

✅ **Faz sentido TER**, mas **não precisa esperar real-time pra implementar**.

**Opção pragmática:**
1. Criar tela agora com **polling curto (5s)** apenas nessa tela
2. Dashboard geral continua sem polling (atualiza on-demand)
3. Quando implementar real-time global → migra essa tela automaticamente

**Por quê não esperar:**
- Feature tem valor NOW (visibilidade das ações do agent)
- Polling de 5s em 1 tela = 12 requests/min = nada
- Real-time é infra, não bloqueia feature

**Query que já existe:**
```typescript
GET /api/agent/tasks?assigneeId=AGENT_ID&limit=20
// Filtrar audit_logs onde source='agent'
```

---

### 🚀 Roadmap Sugerido

**Fase 1: MVP (agora) - 2h**
```
- Tela "AI Activity" com polling 5s
- Mostra: task updated, commented, moved to review
- Filtro: por feature, por agente, last 24h
```

**Fase 2: Real-time Ping (depois) - 4h**
```
- Setup Supabase Realtime com ping system
- Hook useRealtimeInvalidation()
- Migrar tela de AI pra usar real-time
- Dashboard também usa (sem polling)
```

**Fase 3: Otimizações (futuro)**
```
- Batch invalidations (múltiplos pings → 1 refetch)
- Debounce de 500ms em updates rápidos
- Presence (mostrar "Agent is typing...")
```

---

### � Problemas Conhecidos que o Real-time Resolve

**Issue crítico atual:** Cache/optimistic updates quebrados em várias telas

**Sintomas reportados:**
- Atualiza task → UI não reflete mudança
- Precisa refresh manual pra ver estado real
- Optimistic update não reverte em erro
- Inconsistências entre lista e detalhe

**Root cause:**
```typescript
// Problema atual: invalidação manual incompleta
onSuccess: () => {
  queryClient.invalidateQueries(['tasks']); // ❌ Muito genérico
  queryClient.invalidateQueries(['tasks', id]); // ❌ Esquece outras queries
  // Falta invalidar: features, epics, dashboard, etc.
}
```

**Como real-time ping resolve:**
```typescript
// Solução: invalidação automática centralizada
supabase.on('task.updated', ({ taskId, featureId, projectId }) => {
  // Hook centralizado invalida TODAS as queries relacionadas
  queryClient.invalidateQueries(['tasks', taskId]);
  queryClient.invalidateQueries(['features', featureId]);
  queryClient.invalidateQueries(['dashboard']);
  queryClient.invalidateQueries(['projects', projectId]);
  // Nunca mais esquece nenhuma query! ✅
});
```

**Benefício adicional:** Múltiplos usuários/agents veem mudanças em tempo real sem refresh.

---

### 🎨 UX Superior com Background Updates

**Problema atual:** Spinner bloqueia a tela inteira

```typescript
// Hoje: loading state bloqueia UI
if (isLoading) return <Spinner fullScreen />; // ❌ UX ruim
```

**Com ping system:** Updates em background, animações suaves

```typescript
// Com real-time: UI nunca bloqueia
const { data, isRefetching } = useQuery(['tasks'], {
  refetchOnWindowFocus: false // Real-time já atualiza
});

// Card move suavemente com Framer Motion
<AnimatePresence>
  {tasks.map(task => (
    <motion.div
      key={task.id}
      layout // ✅ Anima posição automaticamente
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Card com badge sutil se está atualizando */}
      {isRefetching && <UpdateBadge />}
    </motion.div>
  ))}
</AnimatePresence>
```

**Resultado UX:**
- Task muda de coluna → card **desliza** suavemente (não pisca)
- Status atualiza → badge muda cor com **fade transition**
- Assignee muda → avatar **cross-fade**
- Zero spinners, zero loading states bloqueantes

**Inspiração:** Linear, Height, Asana fazem assim.

---

### 🔴 Red Flags a Evitar

❌ **NÃO fazer:**
- Enviar payload completo no real-time (estoura limite)
- Polling global em todas as telas (mata performance)
- Real-time sem fallback (se Supabase cair, app para)
- Invalidações manuais espalhadas (esquece queries)

✅ **FAZER:**
- Ping system (100 bytes)
- Polling apenas em telas críticas
- Graceful degradation (se real-time falha, fallback pra polling)
- Hook centralizado `useRealtimeInvalidation()` (uma fonte de verdade)

---

### 💰 Custo Real (projeção)

**Cenário: 5 agents ativos, 8h/dia, 20 tasks/dia cada**

```
100 tasks/dia × 5 updates/task = 500 eventos/dia
500 × 30 = 15k eventos/mês

Payload full: 15k × 5KB = 75MB
Ping system:  15k × 100 bytes = 1.5MB

Economia: 98% bandwidth
Custo: FREE tier aguenta tranquilo
```

---

### 🎯 Minha Recomendação Final

1. **Implemente a tela de AI Activity AGORA** com polling 5s
2. **Real-time ping system em seguida** (é infra, vale a pena)
3. **Não trafegue payloads completos** - só IDs + metadata mínima
4. **Use React Query invalidation** - ele já faz o trabalho pesado

**Prioridade ATUALIZADA:**
```
0. Fix cache invalidation (1h, CRÍTICO) ← Resolver antes de real-time
1. Tela AI Activity (2h, valor imediato)
2. Real-time ping system (4h, infra crítica)
3. Background updates com animações (2h, polish UX)
```

**Nota importante:** Antes de implementar real-time, vale a pena **auditar e corrigir** as invalidações de cache atuais. Real-time vai amplificar qualquer problema existente.

O ping system é **exatamente** o que Firebase, Pusher, Ably fazem. É padrão de mercado por um motivo: funciona, escala, e é barato.

---

## 📋 Action Items

**Próximos passos:**

1. **Auditoria de cache (FAZER PRIMEIRO)**
   - [ ] Mapear todas as mutations que não invalidam corretamente
   - [ ] Documentar queries órfãs (nunca invalidadas)
   - [ ] Criar helper centralizado `invalidateRelatedQueries()`

2. **Tela AI Activity**
   - [ ] Endpoint ou query de audit_logs filtrado por source='agent'
   - [ ] Componente com polling 5s
   - [ ] Filtros: por feature, por agente, last 24h

3. **Real-time Ping System**
   - [ ] Setup Supabase Realtime channels
   - [ ] Hook `useRealtimeInvalidation()` centralizado
   - [ ] Migrar telas críticas (dashboard, kanban, tasks)
   - [ ] Testes de stress (múltiplas tabs, múltiplos users)

4. **Polish UX**
   - [ ] Framer Motion layout animations
   - [ ] Background refetch indicators
   - [ ] Toast notifications opcionais

Bora implementar? 🚀