---
tags: [architecture, workflow, state-machine]
priority: high
last-updated: 2025-12
---

# 🔄 Workflows e Máquina de Estados

## Task Workflow (Principal)

O sistema impõe um **fluxo rígido** para tasks:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌─────────┐    ┌──────┐    ┌───────┐    ┌────────┐    ┌─────────┐ │
│  │ BACKLOG │───▶│ TODO │───▶│ DOING │───▶│ REVIEW │───▶│QA_READY │ │
│  └─────────┘    └──────┘    └───────┘    └────────┘    └─────────┘ │
│       │                          ▲                           │      │
│       │                          │         ┌─────────────────┘      │
│       │                          │         │                        │
│       │                          │         ▼                        │
│       │                     ┌────┴────┐  ┌──────┐                   │
│       │                     │Ping-Pong│  │ DONE │                   │
│       │                     └─────────┘  └──────┘                   │
│       │                                                             │
│       └─────────────────────────────────────────────────────────────┘
│                         (Bug criado via "Report Bug")               
└─────────────────────────────────────────────────────────────────────┘
```

---

## Estados Detalhados

| Estado | Descrição | Quem Move | Próximo |
|--------|-----------|-----------|---------|
| **BACKLOG** | Ideias ou bugs reportados | PM/Dev | TODO |
| **TODO** | Selecionado para o ciclo (fila do dev) | Dev | DOING |
| **DOING** | Em desenvolvimento ativo | Dev | REVIEW |
| **REVIEW** | PR aberto, aguardando code review | Reviewer | QA_READY |
| **QA_READY** | Disponível em ambiente de testes | QA | DONE ou DOING |
| **DONE** | Validado e em produção | QA | - |

---

## Transições Permitidas

```typescript
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  'BACKLOG':  ['TODO'],
  'TODO':     ['DOING', 'BACKLOG'],
  'DOING':    ['REVIEW', 'TODO'],
  'REVIEW':   ['QA_READY', 'DOING'],
  'QA_READY': ['DONE', 'DOING'],  // DOING = Ping-Pong
  'DONE':     [],  // Estado final
};
```

### Validação de Transição

```typescript
function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

function transitionTask(task: Task, newStatus: TaskStatus): Task {
  if (!canTransition(task.status, newStatus)) {
    throw new DomainError(
      `Transição inválida: ${task.status} → ${newStatus}`
    );
  }
  return { ...task, status: newStatus };
}
```

---

## Fluxo de QA

### Cenário A: Ping-Pong (Ajustes Menores)

Quando o QA encontra pequenos ajustes que não justificam um bug formal.

```
┌──────────┐                    ┌──────────┐
│ QA_READY │───── Ping-Pong ───▶│  DOING   │
└──────────┘                    └──────────┘
     │                               │
     │                               │
     ▼                               ▼
  QA move                    Mesmo Assignee
  o card                     (Dev notificado)
```

**Regras:**
- Assignee **NÃO** muda
- Dev original recebe notificação
- Histórico registra o ping-pong
- Usado para ajustes menores/rápidos

---

### Cenário B: Bug Real (Feature-Centric Testing)

Quando o QA encontra um bug real que precisa ser rastreado.

```
┌──────────────────────────────────────────────────┐
│                   FEATURE                         │
│                                                   │
│  ┌──────────┐   QA clica    ┌──────────────────┐ │
│  │ QA_READY │──"Report Bug"▶│ Nova Task (BUG)  │ │
│  │  Task    │               │ no BACKLOG       │ │
│  └──────────┘               └──────────────────┘ │
│       │                            │             │
│       │                            │             │
│       ▼                            ▼             │
│   Feature                    Borda Vermelha     │
│   BLOQUEADA                  Prioridade Alta    │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Regras:**
- Bug é criado **vinculado à Feature**
- Bug vai para BACKLOG com destaque visual (borda vermelha)
- Feature pai fica **BLOQUEADA**
- Feature não pode ir para DONE até todos os bugs serem resolvidos

---

## Feature Blocking

### Invariante

```typescript
interface FeatureBlockingRule {
  // Feature não pode ser DONE enquanto houver bugs abertos
  canBeDone(feature: Feature, childTasks: Task[]): boolean;
  
  // Retorna bugs que estão bloqueando
  getBlockingBugs(feature: Feature, childTasks: Task[]): Task[];
}

function canFeatureBeDone(tasks: Task[]): boolean {
  const openBugs = tasks.filter(task => 
    task.type === 'BUG' && 
    task.status !== 'DONE'
  );
  return openBugs.length === 0;
}
```

### Visual na UI

```
┌─────────────────────────────────────────┐
│  Feature: Login com OAuth               │
│  Status: QA_READY                       │
│                                         │
│  ⚠️ BLOQUEADA                           │
│  └── 🐛 BUG-123: Token não persiste    │
│  └── 🐛 BUG-124: Redirect loop         │
│                                         │
│  [Não pode mover para DONE]             │
└─────────────────────────────────────────┘
```

---

## Fluxo do AI Scribe

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. BRAIN DUMP                                                  │
│     ┌──────────────────────────────────────────┐               │
│     │ "precisa arrumar o bug do login que tá   │               │
│     │  quebrando quando o token expira, e      │               │
│     │  também adicionar refresh automático"    │               │
│     └──────────────────────────────────────────┘               │
│                           │                                     │
│                           ▼                                     │
│  2. AI PROCESSING                                               │
│     ┌──────────────────────────────────────────┐               │
│     │ System: Project Context (docs)           │               │
│     │ User: Brain Dump                         │               │
│     │ → GPT-4o-mini / Claude 3.5               │               │
│     └──────────────────────────────────────────┘               │
│                           │                                     │
│                           ▼                                     │
│  3. STAGING AREA (Revisão)                                      │
│     ┌──────────────────────────────────────────┐               │
│     │ Sugestão da IA:                          │               │
│     │                                          │               │
│     │ Feature: Melhorar Auth Token Handling    │               │
│     │ ├── [BUG] Fix token expiration handling  │               │
│     │ └── [TASK] Add auto-refresh mechanism    │               │
│     │                                          │               │
│     │ [Editar] [Aprovar] [Descartar]           │               │
│     └──────────────────────────────────────────┘               │
│                           │                                     │
│                           ▼                                     │
│  4. SAVE (Após aprovação)                                       │
│     ┌──────────────────────────────────────────┐               │
│     │ Cria Feature + Tasks no banco            │               │
│     │ Status inicial: BACKLOG                  │               │
│     └──────────────────────────────────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scrum Poker Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     TASK MODAL                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  📋 APP-042: Implementar refresh token                    │  │
│  │                                                           │  │
│  │  ────────────────────────────────────────────────────     │  │
│  │                                                           │  │
│  │  🃏 SCRUM POKER                                           │  │
│  │                                                           │  │
│  │  Participantes:                                           │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                         │  │
│  │  │ 👤  │ │ 👤  │ │ 👤  │ │ 👤  │                         │  │
│  │  │ ✓   │ │ ✓   │ │ ?   │ │ ✓   │                         │  │
│  │  │João │ │Maria│ │Pedro│ │Ana  │                         │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘                         │  │
│  │                                                           │  │
│  │  Sua escolha:                                             │  │
│  │  [1] [2] [3] [5] [8] [13] [21] [?]                       │  │
│  │                                                           │  │
│  │  [🎯 Revelar Votos] (Moderador)                          │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                              │
                              │ Após "Revelar"
                              ▼

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  🃏 RESULTADO                                                    │
│                                                                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                               │
│  │  5  │ │  5  │ │  8  │ │  5  │                               │
│  │João │ │Maria│ │Pedro│ │Ana  │                               │
│  └─────┘ └─────┘ └─────┘ └─────┘                               │
│                                                                  │
│  Média: 5.75 → Sugestão: 5 pontos                               │
│                                                                  │
│  [✓ Aceitar 5] [↺ Nova Rodada]                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Realtime Flow

```typescript
// Supabase Realtime para votos

// 1. Subscrever no canal da task
const channel = supabase
  .channel(`poker:${taskId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'poker_votes',
    filter: `task_id=eq.${taskId}`,
  }, handleVoteChange)
  .subscribe();

// 2. Votar (insert/update)
await supabase
  .from('poker_votes')
  .upsert({ task_id: taskId, user_id: myId, vote: 5 });

// 3. Revelar (broadcast)
await channel.send({
  type: 'broadcast',
  event: 'reveal',
  payload: { revealed: true },
});
```

---

## Notificações

### Eventos que Geram Notificação

| Evento | Destinatário | Mensagem |
|--------|--------------|----------|
| Task assigned | Assignee | "Task APP-042 foi atribuída a você" |
| Ping-pong (QA → DOING) | Assignee | "Task APP-042 voltou para ajustes" |
| Bug criado | Feature owner | "Bug reportado na feature X" |
| Poker iniciado | Todos na task | "Votação iniciada para APP-042" |
| Menção em comentário | Mencionado | "@você em APP-042" |

---

## Ver Também

- [domain-model.md](./domain-model.md) - Entidades detalhadas
- [../guides/scrum-poker.md](../guides/scrum-poker.md) - Guia do Poker
- [../guides/ai-scribe.md](../guides/ai-scribe.md) - Guia do AI Scribe
