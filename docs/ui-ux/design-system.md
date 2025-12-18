---
tags: [ui-patterns, design-system]
priority: medium
last-updated: 2025-12
---

# 🎨 Design System

## Princípios Visuais

### Tema

O Jira Killer é **Dark Mode First**:

```typescript
// Cores base
const colors = {
  // Background
  background: 'slate-950',       // #020617
  card: 'slate-900',             // #0f172a
  cardHover: 'slate-800',        // #1e293b
  
  // Foreground
  foreground: 'slate-50',        // #f8fafc
  muted: 'slate-400',            // #94a3b8
  
  // Accent
  primary: 'blue-500',           // #3b82f6
  primaryHover: 'blue-600',      // #2563eb
  
  // Semantic
  success: 'green-500',          // #22c55e
  warning: 'yellow-500',         // #eab308
  error: 'red-500',              // #ef4444
  info: 'blue-400',              // #60a5fa
};
```

### Cores Semânticas

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  🐛 BUG           → red-500 (borda ou ícone)                   │
│  ✅ DONE          → green-500                                  │
│  🔄 DOING         → blue-500                                   │
│  ⏳ TODO          → slate-400                                  │
│  📋 BACKLOG       → slate-500                                  │
│  🔍 REVIEW        → purple-500                                 │
│  🧪 QA_READY      → yellow-500                                 │
│                                                                 │
│  ⚡ CRITICAL      → red-500 + pulse animation                  │
│  🔥 HIGH          → orange-500                                 │
│  ➖ MEDIUM        → blue-500                                   │
│  🔽 LOW           → slate-400                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Módulo Badge Colors

Cores geradas por hash da string para **consistência**:

```typescript
// utils/module-colors.ts

const MODULE_COLORS = [
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-green-500/20 text-green-300 border-green-500/30',
  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getModuleColor(module: string): string {
  const index = hashString(module) % MODULE_COLORS.length;
  return MODULE_COLORS[index];
}

// Uso:
// <Badge className={getModuleColor('SDK')}>SDK</Badge>
// Sempre retorna a mesma cor para 'SDK'
```

---

## Tipografia

```css
/* Font stack */
--font-sans: Inter, system-ui, sans-serif;
--font-mono: JetBrains Mono, monospace;

/* Sizes */
--text-xs: 0.75rem;    /* 12px - badges, timestamps */
--text-sm: 0.875rem;   /* 14px - body, cards */
--text-base: 1rem;     /* 16px - default */
--text-lg: 1.125rem;   /* 18px - headings */
--text-xl: 1.25rem;    /* 20px - page titles */
--text-2xl: 1.5rem;    /* 24px - main titles */
```

---

## Espaçamento

Seguimos escala de 4px:

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
```

---

## Animações

### ⚠️ REGRAS IMPORTANTES

```typescript
// ✅ PERMITIDO - Animações sutis
'transition-opacity duration-200'
'transition-colors duration-300'
'translate-y-1 hover:translate-y-0'
'rotate-180'

// ❌ EVITAR - Animações que alteram dimensões
'scale-110'        // Causa reflow
'animate-bounce'   // Muito agressivo
'w-0 to w-full'   // Causa reflow
'h-0 to h-auto'   // Causa reflow
```

### Padrões Recomendados

```typescript
// Hover em cards
'transition-colors duration-200 hover:bg-slate-800'

// Fade in
'opacity-0 animate-in fade-in duration-300'

// Slide in (do sidebar)
'translate-x-full animate-in slide-in-from-right duration-300'

// Pulse para itens críticos (bugs)
'animate-pulse' // Apenas para chamar atenção crítica
```

---

## Bordas e Sombras

```css
/* Border radius */
--radius-sm: 0.375rem;  /* 6px - badges, inputs */
--radius-md: 0.5rem;    /* 8px - cards, buttons */
--radius-lg: 0.75rem;   /* 12px - modals, panels */

/* Shadows (sutis em dark mode) */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.5);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
```

---

## Densidade de Informação

O design é **denso** mas organizado:

```
┌─────────────────────────────────────────────────────────────────┐
│  Princípios:                                                    │
│                                                                 │
│  ✓ Máximo de informação em pouco espaço                        │
│  ✓ Hierarquia visual clara (tamanho, cor, peso)                │
│  ✓ Whitespace estratégico (não excessivo)                      │
│  ✓ Cards compactos mas legíveis                                │
│  ✓ Ícones ao lado de texto (economia de espaço)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Status Badges

```typescript
// components/ui/status-badge.tsx

const STATUS_STYLES: Record<TaskStatus, string> = {
  BACKLOG: 'bg-slate-500/20 text-slate-300',
  TODO: 'bg-slate-400/20 text-slate-200',
  DOING: 'bg-blue-500/20 text-blue-300',
  REVIEW: 'bg-purple-500/20 text-purple-300',
  QA_READY: 'bg-yellow-500/20 text-yellow-300',
  DONE: 'bg-green-500/20 text-green-300',
};

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge className={cn('text-xs', STATUS_STYLES[status])}>
      {status.replace('_', ' ')}
    </Badge>
  );
}
```

---

## Priority Indicators

```typescript
// components/ui/priority-indicator.tsx

const PRIORITY_CONFIG: Record<Priority, { 
  icon: LucideIcon; 
  color: string;
  label: string;
}> = {
  CRITICAL: { 
    icon: AlertCircle, 
    color: 'text-red-500', 
    label: 'Crítico' 
  },
  HIGH: { 
    icon: ArrowUp, 
    color: 'text-orange-500', 
    label: 'Alto' 
  },
  MEDIUM: { 
    icon: Minus, 
    color: 'text-blue-500', 
    label: 'Médio' 
  },
  LOW: { 
    icon: ArrowDown, 
    color: 'text-slate-400', 
    label: 'Baixo' 
  },
};

function PriorityIndicator({ priority }: { priority: Priority }) {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;
  
  return (
    <Tooltip content={config.label}>
      <Icon className={cn('w-4 h-4', config.color)} />
    </Tooltip>
  );
}
```

---

## Responsividade

```typescript
// Breakpoints (Tailwind default)
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px', // Extra large
};

// Padrão: Mobile first
// Kanban: 1 coluna em mobile, 3+ em desktop
// Modal: Full screen em mobile, centered em desktop
```

---

## Acessibilidade

```typescript
// Mínimos obrigatórios

// 1. Contrast ratio mínimo 4.5:1
// slate-300 em slate-950 = OK ✓
// slate-500 em slate-950 = verificar

// 2. Focus visible
'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none'

// 3. Labels em inputs
<label htmlFor="task-title">Título</label>
<Input id="task-title" />

// 4. Aria-live para updates
<div aria-live="polite">
  {notification}
</div>

// 5. Keyboard navigation
'tabindex={0}'
'onKeyDown={(e) => e.key === "Enter" && onClick()}'
```

---

## Ver Também

- [components.md](./components.md) - Componentes específicos
- [../guides/date-handling.md](../guides/date-handling.md) - Formatação de datas na UI
