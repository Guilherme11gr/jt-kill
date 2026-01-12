# Sugestão de Commit Git

## Sessão: 2026-01-12 - Bugfixes & Features (JKILL-85, JKILL-84)

### Commit 1: Fix PostgreSQL format() bug
```bash
git add scripts/fix-recalc-feature-health.sql
git commit -m "fix(database): replace format() with concatenation in recalc_feature_health

- PostgreSQL format('%.0f%%') caused error code 22023
- Replaced with simple string concatenation using || operator
- Tested locally and in production - both passing

Fixes JKILL-85"
```

### Commit 2: Add hierarchical path to kanban cards
```bash
git add src/components/features/tasks/task-hierarchy-path.tsx \
        src/components/features/tasks/task-card.tsx \
        src/components/features/tasks/index.ts

git commit -m "feat(ui): add hierarchical path display to kanban cards

- Created TaskHierarchyPath component with memoization
- Displays 'Project → Epic → Feature' below card title
- CSS truncation with native tooltip (works on mobile)
- Discrete styling (text-[10px] text-muted-foreground/60)
- Zero backend dependencies

Implements JKILL-84"
```

### Commit 3: Update documentation with UTF-8 encoding rules
```bash
git add docs/jira-killer-api.md \
        .github/instructions/copilot-instructions.md

git commit -m "docs: add UTF-8 encoding rules for AI agents

- Always use JSON files with --data-binary for markdown with emojis
- Shells don't preserve UTF-8 in inline strings
- Examples of correct vs incorrect usage

Prevents broken encoding in task descriptions"
```

### Status Final:
- ✅ JKILL-85: DONE (PostgreSQL fix)
- ✅ JKILL-84: DONE (Kanban path)
- ✅ JKILL-69: DONE (AI Adapter streaming)
- ✅ JKILL-70: DONE (API endpoint)
- ❌ JKILL-68: BLOCKED (missing type annotation, needs fixes)
