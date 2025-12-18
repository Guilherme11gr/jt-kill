---
tags: [guides, realtime, features]
priority: medium
last-updated: 2025-12
---

# 🃏 Scrum Poker - Guia de Implementação

> Estimativa in-place sem sair do contexto da task.

## Conceito

O Scrum Poker no Jira Killer é **zero fricção**:
- Acontece dentro do Modal de detalhes da task
- Usa Supabase Realtime para sincronização instantânea
- Votos ocultos até moderador revelar
- Média calculada automaticamente

---

## Fluxo de Uso

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TASK MODAL                                   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  📋 APP-042: Implementar refresh token                         │ │
│  │                                                                 │ │
│  │  Descrição: Quando o access token expira, o sistema deve...   │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  🃏 SCRUM POKER                                                │ │
│  │                                                                 │ │
│  │  ┌─────────────────────────────────────────────────────────┐   │ │
│  │  │  Participantes:                                         │   │ │
│  │  │                                                         │   │ │
│  │  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                   │   │ │
│  │  │  │ 🎴  │  │ 🎴  │  │ ❓  │  │ 🎴  │                   │   │ │
│  │  │  │João │  │Maria│  │Pedro│  │ Ana │                   │   │ │
│  │  │  │ ✓   │  │ ✓   │  │     │  │ ✓   │                   │   │ │
│  │  │  └─────┘  └─────┘  └─────┘  └─────┘                   │   │ │
│  │  └─────────────────────────────────────────────────────────┘   │ │
│  │                                                                 │ │
│  │  Sua escolha:                                                  │ │
│  │  ┌───┬───┬───┬───┬───┬───┬───┬───┐                            │ │
│  │  │ 1 │ 2 │ 3 │ 5 │ 8 │13 │21 │ ? │                            │ │
│  │  └───┴───┴───┴───┴───┴───┴───┴───┘                            │ │
│  │                                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │          🎯 Revelar Votos (Moderador)                    │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Após Revelar

```
┌────────────────────────────────────────────────────────────────────┐
│  🃏 RESULTADO                                                      │
│                                                                    │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                              │
│  │  5  │  │  5  │  │  8  │  │  5  │                              │
│  │João │  │Maria│  │Pedro│  │ Ana │                              │
│  └─────┘  └─────┘  └─────┘  └─────┘                              │
│                                                                    │
│  ────────────────────────────────────────────────────────────────  │
│                                                                    │
│  📊 Estatísticas:                                                  │
│  • Média: 5.75                                                     │
│  • Mediana: 5                                                      │
│  • Sugestão: 5 pontos                                             │
│                                                                    │
│  ┌────────────────────┐  ┌────────────────────┐                   │
│  │   ✓ Aceitar 5      │  │  ↺ Nova Rodada     │                   │
│  └────────────────────┘  └────────────────────┘                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Schema do Banco

```sql
-- Tabela de votos
create table poker_votes (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  vote integer not null,
  created_at timestamptz default now(),
  
  -- Cada usuário só pode ter um voto por task
  unique(task_id, user_id)
);

-- Índice para busca rápida
create index idx_poker_task on poker_votes(task_id);

-- RLS: Usuários podem ver/votar apenas em tasks que têm acesso
alter table poker_votes enable row level security;

create policy "Users can view votes for accessible tasks"
  on poker_votes for select
  using (
    exists (
      select 1 from tasks t
      join features f on f.id = t.feature_id
      join epics e on e.id = f.epic_id
      join projects p on p.id = e.project_id
      where t.id = poker_votes.task_id
      and p.org_id = auth.jwt()->>'org_id'
    )
  );

create policy "Users can insert their own votes"
  on poker_votes for insert
  with check (user_id = auth.uid());

create policy "Users can update their own votes"
  on poker_votes for update
  using (user_id = auth.uid());
```

---

## Implementação Realtime

### Hook de Poker

```typescript
// hooks/use-poker.ts

import { useEffect, useState } from 'react';
import { createClient } from '@/infra/adapters/supabase/client';

interface PokerVote {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  vote?: number;     // undefined = não votou ainda
  revealed: boolean; // valor visível ou oculto
}

interface UsePokerOptions {
  taskId: string;
  currentUserId: string;
}

interface UsePokerReturn {
  votes: PokerVote[];
  myVote: number | null;
  isRevealed: boolean;
  vote: (points: number) => Promise<void>;
  reveal: () => Promise<void>;
  reset: () => Promise<void>;
  stats: PokerStats | null;
}

export function usePoker({ taskId, currentUserId }: UsePokerOptions): UsePokerReturn {
  const [votes, setVotes] = useState<PokerVote[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const supabase = createClient();

  // 1. Carregar votos iniciais
  useEffect(() => {
    loadVotes();
  }, [taskId]);

  // 2. Subscription Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`poker:${taskId}`)
      // Mudanças na tabela poker_votes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poker_votes',
          filter: `task_id=eq.${taskId}`,
        },
        handleVoteChange
      )
      // Broadcast para reveal/reset
      .on('broadcast', { event: 'poker_action' }, handlePokerAction)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  // Votar
  async function vote(points: number) {
    await supabase
      .from('poker_votes')
      .upsert({
        task_id: taskId,
        user_id: currentUserId,
        vote: points,
      });
  }

  // Revelar votos (broadcast para todos)
  async function reveal() {
    const channel = supabase.channel(`poker:${taskId}`);
    await channel.send({
      type: 'broadcast',
      event: 'poker_action',
      payload: { action: 'reveal' },
    });
    setIsRevealed(true);
  }

  // Resetar votação
  async function reset() {
    await supabase
      .from('poker_votes')
      .delete()
      .eq('task_id', taskId);
    
    const channel = supabase.channel(`poker:${taskId}`);
    await channel.send({
      type: 'broadcast',
      event: 'poker_action',
      payload: { action: 'reset' },
    });
    
    setIsRevealed(false);
  }

  // Calcular estatísticas
  const stats = isRevealed ? calculateStats(votes) : null;

  return {
    votes: votes.map(v => ({
      ...v,
      revealed: isRevealed,
    })),
    myVote: votes.find(v => v.userId === currentUserId)?.vote ?? null,
    isRevealed,
    vote,
    reveal,
    reset,
    stats,
  };
}
```

### Cálculo de Estatísticas

```typescript
interface PokerStats {
  average: number;
  median: number;
  suggested: number;
  votes: number[];
}

function calculateStats(votes: PokerVote[]): PokerStats {
  const validVotes = votes
    .filter(v => v.vote !== undefined && v.vote !== -1) // -1 = "?"
    .map(v => v.vote!);

  if (validVotes.length === 0) {
    return { average: 0, median: 0, suggested: 0, votes: [] };
  }

  const sorted = [...validVotes].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const average = sum / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  
  // Sugestão: valor da sequência Fibonacci mais próximo da média
  const fibonacci = [1, 2, 3, 5, 8, 13, 21];
  const suggested = fibonacci.reduce((prev, curr) =>
    Math.abs(curr - average) < Math.abs(prev - average) ? curr : prev
  );

  return { average, median, suggested, votes: validVotes };
}
```

---

## Componentes

### Card de Voto

```typescript
// components/features/poker/vote-card.tsx

interface VoteCardProps {
  vote: PokerVote;
  isRevealed: boolean;
}

function VoteCard({ vote, isRevealed }: VoteCardProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn(
        "w-12 h-16 rounded-lg flex items-center justify-center text-lg font-bold",
        "transition-all duration-300",
        vote.vote !== undefined
          ? isRevealed
            ? "bg-primary text-primary-foreground"
            : "bg-primary/20 text-primary"
          : "bg-muted text-muted-foreground border-2 border-dashed"
      )}>
        {vote.vote !== undefined
          ? isRevealed
            ? vote.vote === -1 ? '?' : vote.vote
            : '🎴'
          : '❓'
        }
      </div>
      
      <Avatar className="h-6 w-6">
        <AvatarImage src={vote.userAvatar} />
        <AvatarFallback>{vote.userName[0]}</AvatarFallback>
      </Avatar>
      
      <span className="text-xs text-muted-foreground">
        {vote.userName}
      </span>
    </div>
  );
}
```

### Seletor de Pontos

```typescript
// components/features/poker/point-selector.tsx

const POINTS = [1, 2, 3, 5, 8, 13, 21, -1]; // -1 = "?"

interface PointSelectorProps {
  selected: number | null;
  onSelect: (points: number) => void;
  disabled?: boolean;
}

function PointSelector({ selected, onSelect, disabled }: PointSelectorProps) {
  return (
    <div className="flex gap-2 justify-center">
      {POINTS.map((point) => (
        <button
          key={point}
          onClick={() => onSelect(point)}
          disabled={disabled}
          className={cn(
            "w-10 h-12 rounded-lg font-bold transition-all",
            selected === point
              ? "bg-primary text-primary-foreground scale-110"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          {point === -1 ? '?' : point}
        </button>
      ))}
    </div>
  );
}
```

### Painel de Resultados

```typescript
// components/features/poker/result-panel.tsx

interface ResultPanelProps {
  stats: PokerStats;
  onAccept: (points: number) => void;
  onNewRound: () => void;
}

function ResultPanel({ stats, onAccept, onNewRound }: ResultPanelProps) {
  return (
    <div className="space-y-4 p-4 bg-muted rounded-lg">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold">{stats.average.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Média</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{stats.median}</div>
          <div className="text-xs text-muted-foreground">Mediana</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-primary">{stats.suggested}</div>
          <div className="text-xs text-muted-foreground">Sugestão</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          className="flex-1" 
          onClick={() => onAccept(stats.suggested)}
        >
          ✓ Aceitar {stats.suggested}
        </Button>
        <Button 
          variant="outline" 
          onClick={onNewRound}
        >
          ↺ Nova Rodada
        </Button>
      </div>
    </div>
  );
}
```

---

## Salvando o Resultado

```typescript
// Ao aceitar os pontos
async function acceptPoints(taskId: string, points: number) {
  await supabase
    .from('tasks')
    .update({ points })
    .eq('id', taskId);
  
  // Limpar votos após aceitar
  await supabase
    .from('poker_votes')
    .delete()
    .eq('task_id', taskId);
}
```

---

## Moderador

O moderador é quem pode:
- Revelar votos
- Resetar votação
- Aceitar pontuação final

```typescript
// Por padrão, o assignee da task é o moderador
// Ou o criador da task se não houver assignee

function isModerator(task: Task, userId: string): boolean {
  return task.assigneeId === userId || task.createdBy === userId;
}
```

---

## Ver Também

- [../architecture/workflows.md](../architecture/workflows.md) - Fluxo de poker no workflow
- [ai-scribe.md](./ai-scribe.md) - Outra feature realtime
