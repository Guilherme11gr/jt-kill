# 🏢 Arquitetura Enterprise-Grade: Real-time System

> **Status:** Draft v1.0
> **Data:** Janeiro 2026
> **Autor:** Gepeto + Guilherme (discussão)

---

## Premissas de Produção

```
- Multi-tenant (múltiplas orgs simultâneas)
- Multi-user (vários devs + agents na mesma org)
- Multi-tab (usuário com 5 tabs abertas)
- Offline-first (funciona sem conexão, sync depois)
- Zero data loss (nenhum evento pode ser perdido)
- Sub-second latency (< 300ms end-to-end)
```

---

## 1. Event Sourcing Lite + CQRS

Linear e Jira usam event sourcing. Não precisamos ir full event sourcing, mas precisamos de:

### Event Log Table (fonte de verdade)

```sql
CREATE TABLE entity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Identifiers
  entity_type VARCHAR(50) NOT NULL, -- 'task', 'feature', 'comment'
  entity_id UUID NOT NULL,
  
  -- Event data
  event_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'status_changed'
  event_data JSONB NOT NULL, -- { field: 'status', from: 'TODO', to: 'DOING' }
  
  -- Actor
  actor_type VARCHAR(20) NOT NULL, -- 'user', 'agent', 'system'
  actor_id UUID NOT NULL,
  actor_name VARCHAR(100), -- 'Guilherme', 'Gepeto'
  
  -- Metadata
  client_id UUID, -- Para dedup em multi-tab
  sequence_number BIGINT, -- Ordenação garantida
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT idx_entity_events_lookup 
    UNIQUE (org_id, entity_type, entity_id, sequence_number)
);

-- Index para queries de timeline
CREATE INDEX idx_entity_events_timeline 
  ON entity_events (org_id, created_at DESC);

-- Index para real-time broadcast
CREATE INDEX idx_entity_events_realtime 
  ON entity_events (org_id, created_at DESC) 
  WHERE created_at > NOW() - INTERVAL '1 hour';
```

### Por que Event Log?

```
1. Audit trail completo (compliance, debug)
2. Replay events (reconstruir estado)
3. Real-time feed (activity stream)
4. Dedup garantido (client_id + sequence)
5. Offline sync (pega eventos desde last_sync)
```

---

## 2. Broadcast Channel Architecture

### Canal por Org (não por projeto)

```typescript
// Um canal por org - mais eficiente que por projeto
const channel = supabase.channel(`org:${orgId}`, {
  config: {
    broadcast: { self: false }, // Não recebo meus próprios eventos
    presence: { key: `${userId}:${tabId}` }, // Track multi-tab
  }
});
```

### Payload Mínimo (Ping Pattern)

```typescript
interface BroadcastEvent {
  // Identificação
  eventId: string;        // UUID do evento (para dedup)
  sequence: number;       // Número sequencial (para ordenação)
  
  // Scope
  entityType: 'task' | 'feature' | 'epic' | 'comment' | 'doc';
  entityId: string;
  projectId: string;      // Para filtro client-side
  
  // Tipo
  eventType: 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned';
  
  // Actor (para mostrar "Gepeto moveu JKILL-123")
  actorType: 'user' | 'agent';
  actorName: string;
  
  // Timestamp
  timestamp: string;
}
// ~200 bytes - 25x menor que payload full
```

---

## 3. Client-Side Event Processor

### Hook Principal: `useRealtimeSync`

```typescript
interface RealtimeSyncConfig {
  orgId: string;
  userId: string;
  tabId: string; // Único por tab
  
  // Callbacks
  onEvent: (event: BroadcastEvent) => void;
  onConnectionChange: (status: ConnectionStatus) => void;
  onSyncRequired: (reason: string) => void;
}

function useRealtimeSync(config: RealtimeSyncConfig) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const lastSequenceRef = useRef<number>(0);
  const pendingEventsRef = useRef<Map<string, BroadcastEvent>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  
  // Batching: acumula eventos por 300ms antes de processar
  const processEventBatch = useCallback(() => {
    const events = Array.from(pendingEventsRef.current.values());
    pendingEventsRef.current.clear();
    
    if (events.length === 0) return;
    
    // Agrupa por query key para invalidação eficiente
    const invalidations = new Set<string>();
    
    for (const event of events) {
      const keys = getInvalidationKeys(event);
      keys.forEach(key => invalidations.add(JSON.stringify(key)));
    }
    
    // Invalida tudo de uma vez
    invalidations.forEach(keyStr => {
      const key = JSON.parse(keyStr);
      queryClient.invalidateQueries({
        queryKey: key,
        refetchType: 'active', // Só refetch queries visíveis
      });
    });
    
    // Notifica UI (para toast, animação, etc)
    events.forEach(event => config.onEvent(event));
    
  }, [queryClient, config.onEvent]);
  
  const queueEvent = useCallback((event: BroadcastEvent) => {
    // Dedup por eventId
    if (pendingEventsRef.current.has(event.eventId)) return;
    
    // Detecta gap de sequência (eventos perdidos)
    if (event.sequence > lastSequenceRef.current + 1) {
      config.onSyncRequired('sequence_gap');
      return;
    }
    
    lastSequenceRef.current = event.sequence;
    pendingEventsRef.current.set(event.eventId, event);
    
    // Debounce 300ms
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(processEventBatch, 300);
    
  }, [processEventBatch, config.onSyncRequired]);
  
  // ... resto do hook (conexão, reconnect, etc)
}
```

---

## 4. Invalidation Strategy Map

### Mapa Completo de Dependências

```typescript
const INVALIDATION_MAP: Record<string, (e: BroadcastEvent) => QueryKey[]> = {
  // ========== TASKS ==========
  'task.created': (e) => [
    ['tasks', 'list', e.projectId],
    ['tasks', 'list', 'feature', e.metadata?.featureId],
    ['features', e.metadata?.featureId], // Task count muda
    ['dashboard', 'stats', e.projectId],
    ['dashboard', 'activity'],
  ],
  
  'task.updated': (e) => [
    ['tasks', e.entityId],
    ['tasks', 'list', e.projectId],
    ['dashboard', 'activity'],
  ],
  
  'task.status_changed': (e) => [
    ['tasks', e.entityId],
    ['tasks', 'list', e.projectId],
    ['tasks', 'list', 'feature', e.metadata?.featureId],
    ['features', e.metadata?.featureId], // Health pode mudar
    ['epics', e.metadata?.epicId, 'stats'],
    ['dashboard', 'stats', e.projectId],
    ['dashboard', 'myTasks'], // Se era minha
    ['dashboard', 'activity'],
    ['kanban', e.projectId], // Board inteiro
  ],
  
  'task.assigned': (e) => [
    ['tasks', e.entityId],
    ['dashboard', 'myTasks'],
    ['dashboard', 'activity'],
  ],
  
  'task.deleted': (e) => [
    ['tasks', 'list', e.projectId],
    ['tasks', 'list', 'feature', e.metadata?.featureId],
    ['features', e.metadata?.featureId],
    ['dashboard', 'stats', e.projectId],
  ],
  
  // ========== FEATURES ==========
  'feature.created': (e) => [
    ['features', 'list', e.metadata?.epicId],
    ['epics', e.metadata?.epicId],
    ['dashboard', 'stats', e.projectId],
  ],
  
  'feature.updated': (e) => [
    ['features', e.entityId],
    ['features', 'list', e.metadata?.epicId],
    ['tasks', 'list', 'feature', e.entityId], // Tasks mostram feature name
  ],
  
  'feature.health_changed': (e) => [
    ['features', e.entityId],
    ['features', 'list', e.metadata?.epicId],
    ['epics', e.metadata?.epicId], // Epic health = pior feature
    ['dashboard', 'health', e.projectId],
  ],
  
  // ========== COMMENTS ==========
  'comment.created': (e) => [
    ['tasks', e.metadata?.taskId, 'comments'],
    ['tasks', e.metadata?.taskId], // Comment count
    ['dashboard', 'activity'],
  ],
  
  'comment.deleted': (e) => [
    ['tasks', e.metadata?.taskId, 'comments'],
    ['tasks', e.metadata?.taskId],
  ],
  
  // ========== DOCS ==========
  'doc.created': (e) => [
    ['docs', 'list', e.projectId],
    ['dashboard', 'activity'],
  ],
  
  'doc.updated': (e) => [
    ['docs', e.entityId],
    ['docs', 'list', e.projectId],
  ],
};

function getInvalidationKeys(event: BroadcastEvent): QueryKey[] {
  const key = `${event.entityType}.${event.eventType}`;
  const handler = INVALIDATION_MAP[key];
  
  if (!handler) {
    console.warn(`[Realtime] Unknown event type: ${key}`);
    return [];
  }
  
  return handler(event);
}
```

---

## 5. Connection Management

### Reconnection com Exponential Backoff

```typescript
class RealtimeConnectionManager {
  private channel: RealtimeChannel | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000; // 1s
  private maxDelay = 30000; // 30s
  
  private getReconnectDelay(): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s...
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxDelay
    );
    // Add jitter (±20%) para evitar thundering herd
    return delay * (0.8 + Math.random() * 0.4);
  }
  
  async connect(): Promise<void> {
    try {
      this.channel = supabase.channel(`org:${this.orgId}`);
      
      this.channel
        .on('broadcast', { event: 'entity_event' }, (payload) => {
          this.handleEvent(payload);
        })
        .on('presence', { event: 'sync' }, () => {
          this.handlePresenceSync();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.reconnectAttempts = 0;
            this.onStatusChange('connected');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.handleDisconnect();
          }
        });
        
    } catch (error) {
      this.handleDisconnect();
    }
  }
  
  private async handleDisconnect(): Promise<void> {
    this.onStatusChange('disconnected');
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onStatusChange('failed');
      this.onSyncRequired('connection_failed');
      return;
    }
    
    const delay = this.getReconnectDelay();
    this.reconnectAttempts++;
    
    console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    await sleep(delay);
    await this.connect();
  }
}
```

---

## 6. Offline Support + Sync

### Last Known State

```typescript
// Persiste último estado conhecido no localStorage
const SYNC_STATE_KEY = 'realtime_sync_state';

interface SyncState {
  orgId: string;
  lastSequence: number;
  lastSyncAt: string;
  pendingMutations: PendingMutation[];
}

function persistSyncState(state: SyncState): void {
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
}

function loadSyncState(): SyncState | null {
  const data = localStorage.getItem(SYNC_STATE_KEY);
  return data ? JSON.parse(data) : null;
}
```

### Catch-up Query (recupera eventos perdidos)

```typescript
async function catchUpEvents(orgId: string, lastSequence: number): Promise<void> {
  // Busca eventos que perdeu enquanto offline
  const { data: events } = await supabase
    .from('entity_events')
    .select('*')
    .eq('org_id', orgId)
    .gt('sequence_number', lastSequence)
    .order('sequence_number', { ascending: true })
    .limit(1000);
  
  if (!events?.length) return;
  
  // Processa eventos em ordem
  for (const event of events) {
    processEvent(event);
  }
  
  // Atualiza state
  persistSyncState({
    orgId,
    lastSequence: events[events.length - 1].sequence_number,
    lastSyncAt: new Date().toISOString(),
    pendingMutations: [],
  });
}
```

---

## 7. Optimistic Updates + Rollback

### Mutation com Rollback Automático

```typescript
function useTaskMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateTask,
    
    onMutate: async (variables) => {
      // 1. Cancel queries em andamento
      await queryClient.cancelQueries(['tasks', variables.id]);
      
      // 2. Snapshot para rollback
      const previousTask = queryClient.getQueryData(['tasks', variables.id]);
      const previousList = queryClient.getQueryData(['tasks', 'list', variables.projectId]);
      
      // 3. Optimistic update
      queryClient.setQueryData(['tasks', variables.id], (old: Task) => ({
        ...old,
        ...variables.data,
        _optimistic: true, // Flag para UI saber que é optimistic
      }));
      
      // 4. Update na lista também
      queryClient.setQueryData(['tasks', 'list', variables.projectId], (old: Task[]) =>
        old?.map(t => t.id === variables.id ? { ...t, ...variables.data, _optimistic: true } : t)
      );
      
      return { previousTask, previousList };
    },
    
    onError: (err, variables, context) => {
      // Rollback completo
      if (context?.previousTask) {
        queryClient.setQueryData(['tasks', variables.id], context.previousTask);
      }
      if (context?.previousList) {
        queryClient.setQueryData(['tasks', 'list', variables.projectId], context.previousList);
      }
      
      toast.error('Falha ao atualizar. Revertido.');
    },
    
    onSuccess: (data, variables) => {
      // Real-time vai invalidar, mas podemos atualizar direto
      queryClient.setQueryData(['tasks', variables.id], {
        ...data,
        _optimistic: false,
      });
    },
    
    // Não invalida no settled - real-time cuida disso
    onSettled: () => {},
  });
}
```

---

## 8. UI Feedback Layer

### Indicadores Visuais

```typescript
// Badge de "updating" sutil
function TaskCard({ task }: { task: Task }) {
  const { isFetching } = useQuery(['tasks', task.id]);
  
  return (
    <motion.div
      layout // Anima posição automaticamente
      layoutId={task.id}
      className={cn(
        'relative',
        task._optimistic && 'opacity-70' // Dimmed se optimistic
      )}
    >
      {/* Pulse indicator se atualizando */}
      {isFetching && (
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
      )}
      
      {/* Conteúdo do card */}
    </motion.div>
  );
}

// Toast de atividade de outros usuários
function useActivityToasts() {
  useRealtimeEvents((event) => {
    // Não mostra toast para minhas próprias ações
    if (event.actorId === currentUserId) return;
    
    // Toast sutil para ações de outros
    toast.info(
      `${event.actorName} ${getActionVerb(event.eventType)} ${event.entityType}`,
      { duration: 3000 }
    );
  });
}
```

---

## 9. Monitoring & Debug

### DevTools Panel

```typescript
// Componente de debug (só em dev)
function RealtimeDevTools() {
  const { events, status, stats } = useRealtimeDebug();
  
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed bottom-4 right-4 p-4 bg-black/90 text-white text-xs font-mono">
      <div>Status: {status}</div>
      <div>Events: {stats.total} ({stats.perSecond}/s)</div>
      <div>Pending: {stats.pending}</div>
      <div>Last seq: {stats.lastSequence}</div>
      <div className="mt-2 max-h-40 overflow-auto">
        {events.slice(-10).map(e => (
          <div key={e.eventId}>
            {e.entityType}.{e.eventType} by {e.actorName}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 📊 Resumo da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  React      │  │  Realtime   │  │  Sync       │              │
│  │  Query      │◄─┤  Processor  │◄─┤  Manager    │              │
│  │  Cache      │  │  (debounce) │  │  (offline)  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         ▲                 ▲                ▲                     │
│         │                 │                │                     │
│         ▼                 ▼                ▼                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Supabase Realtime Channel                      ││
│  │              (WebSocket, org-scoped)                        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER (Supabase)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Postgres   │──┤  Trigger    │──┤  Broadcast  │              │
│  │  Tables     │  │  Function   │  │  (Realtime) │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              entity_events (Event Log)                      ││
│  │              - Audit trail completo                         ││
│  │              - Replay/sync capability                       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Decisões Tomadas

| Aspecto | Decisão | Justificativa |
|---------|---------|---------------|
| **Granularidade** | Por entidade | Controle fino, evita over-fetch |
| **Debounce** | 300ms | Balança responsividade vs eficiência |
| **Fallback** | Polling em telas críticas + toast | Graceful degradation |
| **Canal** | Por org | Simples, 1 conexão, filtro client-side |
| **Invalidation** | Mapa completo de dependências | Zero queries órfãs |
| **StaleTime** | 0 para mutáveis, 30s para estáveis | Consistência garantida |
| **Offline** | Event log + catch-up query | Zero data loss |
| **Optimistic** | Com rollback automático | UX instantânea |

---

## 🔄 Próximos Passos

1. **Auditoria do estado atual** - Mapear query keys existentes, cache config atual
2. **Revisão de compatibilidade** - Validar se plano é compatível com arquitetura existente
3. **Estimativa de esforço** - Quebrar em tasks menores
4. **POC** - Implementar canal + 1 evento pra validar

---

> **Nota:** Este documento será revisado após auditoria do projeto atual.
