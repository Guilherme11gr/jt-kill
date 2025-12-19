---
tags: [ui, tasks, kanban, table, planning]
priority: high
created: 2025-12-19
---

# 📋 Tasks UI - Plano de Implementação

> Views Kanban e Table modularizadas com drag-drop 60fps e animações fluidas.

---

## Arquitetura Modular

```
src/
├── lib/views/                    ← Views como módulos isolados
│   ├── kanban/
│   │   ├── index.ts
│   │   ├── kanban-board.tsx
│   │   ├── kanban-column.tsx
│   │   ├── kanban-card.tsx
│   │   ├── use-drag-drop.ts
│   │   └── types.ts
│   └── table/
│       ├── index.ts
│       ├── task-table.tsx
│       ├── table-row.tsx
│       ├── use-virtual-scroll.ts
│       └── types.ts
│
├── components/features/tasks/    ← Componentes compartilhados
│   ├── task-card.tsx
│   ├── task-modal.tsx
│   ├── task-skeleton.tsx
│   ├── task-filters.tsx
│   ├── priority-indicator.tsx
│   ├── status-badge.tsx
│   └── view-toggle.tsx
│
└── app/(dashboard)/tasks/
    └── page.tsx
```

---

## Fases de Implementação

### Fase 1: Foundation (5 tasks)
- Criar estrutura `lib/views/`
- Criar `TaskCard` base
- Criar `TaskSkeleton`
- Criar `StatusBadge`
- Criar `PriorityIndicator`

### Fase 2: Kanban View (5 tasks)
- Instalar @dnd-kit
- Criar `useDragDrop` hook
- Criar `KanbanColumn`
- Criar `KanbanBoard`
- Implementar optimistic updates

### Fase 3: Table View (4 tasks)
- Criar `TaskTable`
- Criar `TableRow`
- Criar sorting
- Criar virtual scroll

### Fase 4: Integration (4 tasks)
- Criar `ViewToggle`
- Criar `TaskFilters`
- Implementar `/tasks` page
- Criar `TaskModal`

### Fase 5: Polish (3 tasks)
- Animações de transição
- Skeletons por view
- Empty states

---

## Requisitos de Performance

### Drag-and-Drop 60fps
- Usar `transform` apenas (não width/height)
- `will-change: transform` durante drag
- Overlay portal para drag preview
- Optimistic update local → sync background

### Tecnologia Recomendada
**@dnd-kit** - Melhor performance, 60fps nativo, accessible

---

## Animações Permitidas

```typescript
// ✅ PERMITIDO
'transition-colors duration-200'
'opacity-0 animate-in fade-in-200'
'translate-y-1 hover:translate-y-0'
'cursor-grabbing'
'rotate-2'
'scale-[1.02] shadow-lg'

// ❌ EVITAR
'scale-110'
'animate-bounce'
```

---

## Verificação

1. Chrome DevTools → 60fps durante drag
2. Keyboard navigation no Kanban
3. Touch drag funcionando
4. Loading states visíveis
