# Tag Unification: ProjectTag

**Data:** 2026-01-12  
**Status:** 🔴 PENDENTE (Requer Migration)

## Problema

Dois sistemas de tags separados criavam redundância:

- **TaskTag** (`task_tags`): Tags para tasks/features (com `color`, `description`)
- **DocTag** (`doc_tags`): Tags para docs (só `name`, sem color)

**Problemas:**
1. Duplicação de lógica (2 tabelas, 2 APIs, 2 componentes UI)
2. Tags não compartilhados (tag "backend" em task ≠ tag "backend" em doc)
3. TagSelector incompatível com docs (espera `color` obrigatório)

## Solução

**Unificar em `ProjectTag`** - tabela única para todos os tipos de tags.

### Schema Changes

```prisma
// ANTES
model TaskTag { ... }  // task_tags
model DocTag { ... }   // doc_tags

// DEPOIS
model ProjectTag {  // project_tags (tabela renomeada)
  // ... campos de TaskTag (color, description)
  docAssignments DocTagAssignment[]  // + relação com docs
}
```

### Migration Strategy

**Arquivo:** `prisma/migrations/20260112_unify_tags/migration.sql`

1. Renomear `task_tags` → `project_tags`
2. Migrar dados de `doc_tags` → `project_tags` (color = #6b7280 default)
3. Atualizar `doc_tag_assignments.tag_id` → FK para `project_tags`
4. Drop `doc_tags` table
5. Update foreign keys e índices

**Rollback:** `rollback.sql` disponível para reverter

### API Impact

✅ **Sem breaking changes** - Endpoints mantém mesma interface:
- `POST /api/projects/[id]/docs` (já aceitava `tagIds`)
- `PATCH /api/docs/[id]` (já aceitava `tagIds`)

### UI Impact

✅ **TagSelector agora funciona para docs:**
- `color` é opcional (default gray se não especificado)
- Mesmo componente para tasks, features e docs
- UX consistente em todo sistema

## Benefícios

1. ✅ **DRY**: Uma tabela, uma API, um componente
2. ✅ **UX**: Tags compartilhados (tag "backend" unificado)
3. ✅ **Semântica**: "ProjectTag" é mais claro que "TaskTag"
4. ✅ **Flexibilidade**: Color opcional permite uso em docs sem color

## Migration Steps

```bash
# 1. Aplicar migration
mcp supabase migration push

# 2. Regenerar Prisma Client
npm run prisma:generate

# 3. TypeCheck e Build
npm run build

# 4. Smoke test em dev
npm run dev
# Testar criação de doc com tags
```

## Rollback Plan

Se necessário reverter:

```bash
psql $DATABASE_URL -f prisma/migrations/20260112_unify_tags/rollback.sql
```

## Files Changed

**Schema:**
- `prisma/schema.prisma` - ProjectTag model + relations

**Migrations:**
- `prisma/migrations/20260112_unify_tags/migration.sql`
- `prisma/migrations/20260112_unify_tags/rollback.sql`

**Frontend:**
- `src/lib/query/hooks/use-project-docs.ts` - tagIds in interfaces
- `src/components/features/projects/doc-editor-modal.tsx` - tagIds in submit

**Types (gerados automaticamente após prisma:generate):**
- `@prisma/client` - ProjectTag, DocTagAssignment

## Testing Checklist

- [ ] Migration aplicada sem erros
- [ ] Prisma Client gerado
- [ ] TypeCheck PASS
- [ ] Build PASS
- [ ] Criar doc com tags (UI + persistência)
- [ ] Editar doc e alterar tags
- [ ] Tags aparecem corretamente em listagem
- [ ] TaskSelector ainda funciona para tasks
- [ ] FeatureTags ainda funcionam

## Notes

- Color é opcional (`String @default("#6366f1")`)
- Docs migrados terão color gray (#6b7280)
- Tasks/features mantém color original
- Constraint `UNIQUE(projectId, name)` previne duplicatas
