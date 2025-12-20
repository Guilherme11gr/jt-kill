# 🗺️ Technical Roadmap - Jira Killer

> Roadmap técnico ordenado por prioridade de desenvolvimento.  
> **Última atualização:** 2025-12-19

---

## 📋 Visão Geral

O desenvolvimento segue 3 fases:
1. **Fase 1:** Melhorias Técnicas Básicas ✅ (já existiam)
2. **Fase 2:** Features Core de Gerenciador de Projetos ✅ (implementado)
3. **Fase 3:** AI Features (próximo)

---

## 🔧 Fase 1: Melhorias Técnicas Básicas ✅

Já implementado no projeto:

| # | Feature | Status | Descrição |
|---|---------|--------|-----------|
| 1.1 | **Error Handling** | ✅ | `src/shared/errors/index.ts` - Classes de erro + handleError |
| 1.2 | **Validação Zod** | ✅ | `src/shared/utils/validators.ts` - Schemas completos |
| 1.3 | **Unit Tests** | ⚠️ Parcial | Vitest configurado, specs existentes |
| 1.4 | **Paginação** | ✅ | Offset-based em todas APIs |
| 1.5 | **Logging** | ⚠️ | Básico via console |
| 1.6 | **Rate Limiting** | ✅ | `src/shared/utils/rate-limit.ts` - In-memory rate limiter |

---

## 📦 Fase 2: Features Core de Gerenciador ✅

### 2.1 Assignee (Atribuição de Tasks) ✅
**Implementado:**
- ✅ Repository: `UserProfileRepository`
- ✅ API: `GET /api/users` (lista membros)
- ✅ API: `GET/PATCH /api/users/me` (perfil atual)
- ✅ Hooks: `useUsers()`, `useCurrentUser()`, `useUpdateProfile()`
- ✅ Task já suporta `assigneeId` no update

### 2.2 Comments (Comentários em Tasks) ✅
**Implementado:**
- ✅ Repository: `CommentRepository`
- ✅ API: `GET/POST /api/tasks/[id]/comments`
- ✅ API: `PATCH/DELETE /api/comments/[id]`
- ✅ Hooks: `useComments()`, `useAddComment()`, `useUpdateComment()`, `useDeleteComment()`

### 2.3 Project Docs (Documentação de Projeto) ✅
**Implementado:**
- ✅ Repository: `ProjectDocRepository`
- ✅ API: `GET/POST /api/projects/[id]/docs`
- ✅ API: `GET/PATCH/DELETE /api/docs/[id]`
- ✅ Hooks: `useProjectDocs()`, `useDoc()`, `useCreateDoc()`, `useUpdateDoc()`, `useDeleteDoc()`

### 2.4 User Profile ✅
**Implementado:**
- ✅ Repository: `UserProfileRepository`
- ✅ API: `/api/users/me`
- ✅ Hooks: `useCurrentUser()`, `useUpdateProfile()`

### 2.5 Realtime Updates
**Prioridade:** 🟢 Baixa | **Status:** ❌ Pendente

Para Kanban colaborativo:
- [ ] Supabase Realtime subscriptions
- [ ] Invalidar React Query cache em updates externos
- [ ] Indicador de "outros editando"

---

## 🤖 Fase 3: AI Features

### 3.1 AI Scribe
**Prioridade:** 🔴 Alta (próximo) | **Complexidade:** Alta

Transformar "brain dumps" em tasks estruturadas:
- [ ] Endpoint: POST /api/ai/scribe
- [ ] Usar `project_docs` como contexto
- [ ] Staging area para revisão
- [ ] OpenAI/Claude integration

### 3.2 Scrum Poker
**Prioridade:** 🟡 Média | **Complexidade:** Alta

Estimativas colaborativas:
- [ ] API: CRUD /api/poker-sessions
- [ ] Realtime voting via Supabase
- [ ] UI: Modal de votação no Task

---

## 📂 Arquivos Criados/Modificados

### Repositories (Fase 2)
- `src/infra/adapters/prisma/comment.repository.ts` ✨ NEW
- `src/infra/adapters/prisma/project-doc.repository.ts` ✨ NEW
- `src/infra/adapters/prisma/user-profile.repository.ts` ✨ NEW
- `src/infra/adapters/prisma/index.ts` 📝 Updated

### APIs (Fase 2)
- `src/app/api/tasks/[id]/comments/route.ts` ✨ NEW
- `src/app/api/comments/[id]/route.ts` ✨ NEW
- `src/app/api/projects/[id]/docs/route.ts` ✨ NEW
- `src/app/api/docs/[id]/route.ts` ✨ NEW
- `src/app/api/users/route.ts` ✨ NEW
- `src/app/api/users/me/route.ts` ✨ NEW

### React Query Hooks (Fase 2)
- `src/lib/query/hooks/use-comments.ts` ✨ NEW
- `src/lib/query/hooks/use-project-docs.ts` ✨ NEW
- `src/lib/query/hooks/use-users.ts` ✨ NEW
- `src/lib/query/hooks/index.ts` 📝 Updated

### Utils
- `src/shared/http/auth.helpers.ts` 📝 Added `extractUserId()`
- `src/shared/http/responses.ts` 📝 Added `jsonRateLimited()`
- `src/shared/utils/rate-limit.ts` ✨ NEW - Rate limiter
- `src/lib/query/query-keys.ts` 📝 Added keys for comments, docs, users

### Shared Types
- `src/shared/types/comment.types.ts` ✨ NEW
- `src/shared/types/project-doc.types.ts` ✨ NEW
- `src/shared/types/user.types.ts` ✨ NEW

### Other
- `src/app/api/health/route.ts` 📝 Enhanced with version, uptime, latency

---

## 🚀 Próximos Passos

1. **Testar APIs** - Rodar o servidor e testar endpoints
2. **Criar UI** para Comments, Project Docs, Assignee
3. **AI Scribe** - Implementar Fase 3

---

*Documento atualizado em 2025-12-19.*
