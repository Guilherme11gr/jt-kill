---
tags: [ui-patterns, components]
priority: medium
last-updated: 2025-12
---

# 🧩 Componentes Chave

## Task Card (Kanban)

O card do Kanban é o componente mais importante. Deve ser **denso** mas **legível**.

### Anatomia

```
┌─────────────────────────────────────────┐
│ [SDK] APP-042           ⚡              │  ← Header: Badge + ID + Prioridade
├─────────────────────────────────────────┤
│ Implementar refresh token               │  ← Body: Título (truncado 3 linhas)
│ automático quando access...             │
├─────────────────────────────────────────┤
│ 👤 João    [5]    🐛                    │  ← Footer: Avatar + Points + Bug indicator
└─────────────────────────────────────────┘
```

### Implementação

```typescript
// components/features/kanban/task-card.tsx

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const isBug = task.type === 'BUG';
  
  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-3 cursor-pointer transition-colors hover:bg-slate-800",
        isBug && "border-l-2 border-l-red-500"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {task.module && (
            <Badge className={getModuleColor(task.module)} size="sm">
              {task.module}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground font-mono">
            {task.key}
          </span>
        </div>
        <PriorityIndicator priority={task.priority} />
      </div>

      {/* Body */}
      <h4 className="text-sm font-medium line-clamp-3 mb-2">
        {task.title}
      </h4>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={task.assignee.avatar} />
              <AvatarFallback>{task.assignee.name[0]}</AvatarFallback>
            </Avatar>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {task.points && (
            <Badge variant="outline" size="sm">
              {task.points}
            </Badge>
          )}
          {isBug && (
            <Bug className="w-4 h-4 text-red-500" />
          )}
        </div>
      </div>
    </Card>
  );
}
```

---

## Task Modal (Detail View)

O modal de detalhes é dividido 70/30:

```
┌───────────────────────────────────────────────────────────────────────┐
│                           APP-042                              [X]   │
├────────────────────────────────────────────┬──────────────────────────┤
│                                            │                          │
│  📝 CONTEÚDO (70%)                         │  📊 SIDEBAR (30%)        │
│                                            │                          │
│  Título: Implementar refresh token         │  Status:                 │
│                                            │  [DOING ▼]               │
│  Descrição:                                │                          │
│  ┌──────────────────────────────────────┐  │  Assignee:               │
│  │ Quando o access token expira, o      │  │  [João Silva ▼]          │
│  │ sistema deve automaticamente...      │  │                          │
│  └──────────────────────────────────────┘  │  Module:                 │
│                                            │  [AUTH ▼]                │
│  ────────────────────────────────────────  │                          │
│                                            │  Priority:               │
│  🃏 SCRUM POKER                            │  [HIGH ▼]                │
│  ┌──────────────────────────────────────┐  │                          │
│  │  [1][2][3][5][8][13][21][?]          │  │  Points:                 │
│  │                                      │  │  [5]                     │
│  │  👤 👤 👤 ❓                          │  │                          │
│  │                                      │  │  Created:                │
│  │  [Revelar Votos]                     │  │  18/12/2025              │
│  └──────────────────────────────────────┘  │                          │
│                                            │                          │
└────────────────────────────────────────────┴──────────────────────────┘
```

### Implementação

```typescript
// components/features/task/task-modal.tsx

interface TaskModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

function TaskModal({ task, isOpen, onClose }: TaskModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-muted-foreground">{task.key}</span>
            {task.type === 'BUG' && (
              <Badge variant="destructive">BUG</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-full">
          {/* Content (70%) */}
          <div className="flex-1 space-y-6 overflow-y-auto">
            <Input 
              value={task.title}
              className="text-lg font-medium"
            />
            
            <div>
              <Label>Descrição</Label>
              <MarkdownEditor 
                value={task.description || ''} 
                onChange={updateDescription}
              />
            </div>

            <Separator />

            <ScrumPokerSection taskId={task.id} />
          </div>

          {/* Sidebar (30%) */}
          <div className="w-64 space-y-4 border-l pl-6">
            <div>
              <Label>Status</Label>
              <Select value={task.status} onValueChange={updateStatus}>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </Select>
            </div>

            <div>
              <Label>Assignee</Label>
              <UserSelect 
                value={task.assigneeId} 
                onValueChange={updateAssignee}
              />
            </div>

            <div>
              <Label>Module</Label>
              <ModuleSelect 
                value={task.module}
                modules={project.modules}
                onValueChange={updateModule}
              />
            </div>

            <div>
              <Label>Priority</Label>
              <PrioritySelect 
                value={task.priority}
                onValueChange={updatePriority}
              />
            </div>

            <Separator />

            <div className="text-xs text-muted-foreground">
              <div>Criado: {formatDateForDisplay(task.createdAt)}</div>
              {task.points && <div>Points: {task.points}</div>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Dashboard "My Focus"

A tela inicial agrupa por **módulo** com bugs em destaque:

```
┌─────────────────────────────────────────────────────────────────────┐
│  👋 Olá, João                                              [🔔] [⚙]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🔴 MEUS BUGS E BLOQUEIOS                                          │
│  ┌─────────────┐  ┌─────────────┐                                  │
│  │ ⚠️ BUG-123  │  │ ⚠️ BUG-456  │                                  │
│  │ Auth broken │  │ API timeout │                                  │
│  │ border-red  │  │ border-red  │                                  │
│  └─────────────┘  └─────────────┘                                  │
│                                                                     │
│  ────────────────────────────────────────────────────────────────  │
│                                                                     │
│  📦 SDK CORE                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │ TASK-789   │  │ TASK-012   │  │ TASK-345   │                │
│  │ DOING      │  │ TODO       │  │ TODO       │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
│                                                                     │
│  🌐 API                                                            │
│  ┌─────────────┐  ┌─────────────┐                                  │
│  │ TASK-678   │  │ TASK-901   │                                  │
│  │ REVIEW     │  │ DOING      │                                  │
│  └─────────────┘  └─────────────┘                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Implementação

```typescript
// components/features/dashboard/my-focus.tsx

interface MyFocusProps {
  userId: string;
}

function MyFocus({ userId }: MyFocusProps) {
  const { tasks, bugs, isLoading } = useMyTasks(userId);
  const groupedByModule = groupTasksByModule(tasks);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8">
      {/* Bugs Section */}
      {bugs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="text-red-500" />
            Meus Bugs e Bloqueios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {bugs.map(bug => (
              <TaskCard 
                key={bug.id} 
                task={bug}
                className="border-red-500/50"
              />
            ))}
          </div>
        </section>
      )}

      {/* Grouped by Module */}
      {Object.entries(groupedByModule).map(([module, moduleTasks]) => (
        <section key={module}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="text-muted-foreground" />
            {module || 'Sem módulo'}
            <Badge variant="outline">{moduleTasks.length}</Badge>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {moduleTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// Helper para agrupar
function groupTasksByModule(tasks: Task[]): Record<string, Task[]> {
  return tasks.reduce((acc, task) => {
    const module = task.module || '_none';
    if (!acc[module]) acc[module] = [];
    acc[module].push(task);
    return acc;
  }, {} as Record<string, Task[]>);
}
```

---

## Report Bug Button

Localizado no header da Feature ou linha da tabela:

```typescript
// components/features/bug/report-bug-button.tsx

interface ReportBugButtonProps {
  featureId: string;
  featureTitle: string;
}

function ReportBugButton({ featureId, featureTitle }: ReportBugButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        variant="destructive" 
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        <Bug className="w-4 h-4 mr-2" />
        Report Bug
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar Bug</DialogTitle>
            <DialogDescription>
              Bug será vinculado à feature: {featureTitle}
            </DialogDescription>
          </DialogHeader>

          <BugForm 
            featureId={featureId}
            onSuccess={() => setIsOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// O formulário vem com feature e type pré-preenchidos
function BugForm({ featureId, onSuccess }) {
  return (
    <form onSubmit={handleSubmit}>
      <Input 
        name="title" 
        placeholder="Título do bug"
        required 
      />
      
      <Textarea 
        name="description" 
        placeholder="Descrição detalhada..."
        required 
      />
      
      {/* Feature travada */}
      <Input 
        value={featureTitle} 
        disabled 
        className="bg-muted"
      />
      
      {/* Type travado */}
      <Badge variant="destructive">BUG</Badge>

      <Button type="submit">
        Criar Bug
      </Button>
    </form>
  );
}
```

---

## Kanban Board

```typescript
// components/features/kanban/kanban-board.tsx

const COLUMNS: TaskStatus[] = [
  'BACKLOG',
  'TODO', 
  'DOING',
  'REVIEW',
  'QA_READY',
  'DONE'
];

function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const tasksByStatus = groupByStatus(tasks);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={tasksByStatus[status] || []}
          onDrop={(taskId) => moveTask(taskId, status)}
        />
      ))}
    </div>
  );
}

function KanbanColumn({ status, tasks, onDrop }) {
  return (
    <div 
      className="flex-shrink-0 w-72 bg-slate-900 rounded-lg p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e.dataTransfer.getData('taskId'))}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-muted-foreground">({tasks.length})</span>
        </h3>
      </div>

      <div className="space-y-3">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('taskId', task.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Ver Também

- [design-system.md](./design-system.md) - Princípios visuais
- [../guides/scrum-poker.md](../guides/scrum-poker.md) - Componentes de Poker
