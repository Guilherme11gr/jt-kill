---
epic: "01. Auth & Multi-tenancy"
status: TODO
priority: P0
sprint: 1
tags: [auth, security, multi-tenant]
---

# 🔐 Épico 01: Auth & Multi-tenancy

## Objetivo

Implementar autenticação segura e sistema multi-tenant completo, permitindo que múltiplas organizações usem o sistema de forma isolada.

## Problema de Negócio

Sem autenticação e multi-tenancy:
- ❌ Impossível identificar usuários
- ❌ Dados de diferentes empresas se misturam
- ❌ Sem controle de acesso
- ❌ Vulnerabilidades de segurança

## Solução

Sistema de autenticação via Supabase Auth + Row Level Security (RLS) para isolamento de dados por organização.

---

## Features

### ✅ Feature 1.1: Supabase Auth Setup
**Status:** 🔴 TODO  
**Prioridade:** P0  
**Estimativa:** 3 pontos

**Descrição:**
Configurar Supabase Auth com email/password e preparar infraestrutura para OAuth futuro.

**Critérios de Aceite:**
- [ ] Projeto Supabase criado e configurado
- [ ] Variáveis de ambiente configuradas (.env.local)
- [ ] Auth helpers (client/server) funcionando
- [ ] Middleware de autenticação configurado

**Tarefas Técnicas:**
- [ ] Criar projeto no Supabase Dashboard
- [ ] Configurar variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] Implementar `createClient()` e `createServerClient()`
- [ ] Criar middleware para refresh de sessão

**Arquivos Envolvidos:**
- `.env.local`
- `src/infra/adapters/supabase/client.ts`
- `src/infra/adapters/supabase/server.ts`
- `middleware.ts`

---

### ✅ Feature 1.2: Login & Signup Flow
**Status:** 🔴 TODO  
**Prioridade:** P0  
**Estimativa:** 5 pontos

**Descrição:**
Telas de login e cadastro com validação de formulário e tratamento de erros.

**Critérios de Aceite:**
- [ ] Tela de login funcional
- [ ] Tela de signup funcional
- [ ] Validação de email e senha (min 8 chars)
- [ ] Feedback visual de erros
- [ ] Redirecionamento após login

**Tarefas Técnicas:**
- [ ] Criar página `/app/(auth)/login/page.tsx`
- [ ] Criar página `/app/(auth)/signup/page.tsx`
- [ ] Implementar `useAuth` hook
- [ ] Criar componente LoginForm
- [ ] Criar componente SignupForm
- [ ] Adicionar validação com Zod

**Arquivos Envolvidos:**
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/signup/page.tsx`
- `src/hooks/use-auth.ts`
- `src/components/auth/login-form.tsx`
- `src/components/auth/signup-form.tsx`

---

### ✅ Feature 1.3: RLS Policies
**Status:** 🔴 TODO  
**Prioridade:** P0  
**Estimativa:** 8 pontos

**Descrição:**
Implementar Row Level Security em todas as tabelas para isolamento de dados por organização.

**Critérios de Aceite:**
- [ ] Policies criadas para todas as tabelas
- [ ] Usuário só vê dados da própria org
- [ ] Tentativa de acesso cross-org retorna 403
- [ ] Policies testadas manualmente

**Tarefas Técnicas:**
- [ ] Criar migration com RLS policies
- [ ] Policy para `organizations`
- [ ] Policy para `projects`
- [ ] Policy para `epics`, `features`, `tasks`
- [ ] Policy para `poker_votes`
- [ ] Testar com múltiplas orgs

**Arquivos Envolvidos:**
- `supabase/migrations/XXXXXX_add_rls_policies.sql`

**Exemplo de Policy:**
```sql
create policy "Users can view projects in their org"
  on projects for select
  using (org_id = (auth.jwt()->>'org_id')::uuid);
```

---

### ✅ Feature 1.4: Organization CRUD
**Status:** 🔴 TODO  
**Prioridade:** P0  
**Estimativa:** 5 pontos

**Descrição:**
Criar, ler, atualizar e deletar organizações. Primeira organização criada no signup.

**Critérios de Aceite:**
- [ ] Criar org ao fazer signup
- [ ] Listar org do usuário
- [ ] Atualizar nome da org
- [ ] Deletar org (cascade)

**Tarefas Técnicas:**
- [ ] Use case: `createOrganization`
- [ ] Use case: `getOrganization`
- [ ] Use case: `updateOrganization`
- [ ] Use case: `deleteOrganization`
- [ ] API route: `POST /api/organizations`
- [ ] API route: `GET /api/organizations/[id]`
- [ ] API route: `PATCH /api/organizations/[id]`
- [ ] API route: `DELETE /api/organizations/[id]`

**Arquivos Envolvidos:**
- `src/domain/use-cases/create-organization.ts`
- `src/domain/use-cases/get-organization.ts`
- `src/app/api/organizations/route.ts`
- `src/app/api/organizations/[id]/route.ts`

---

### ✅ Feature 1.5: Helper `extractAuthenticatedTenant`
**Status:** 🔴 TODO  
**Prioridade:** P0  
**Estimativa:** 3 pontos

**Descrição:**
Helper reutilizável para extrair userId + tenantId (orgId) de forma segura em rotas protegidas.

**Critérios de Aceite:**
- [ ] Helper retorna `{ userId, tenantId }`
- [ ] Lança `UnauthorizedError` se não autenticado
- [ ] Lança `ForbiddenError` se sem org
- [ ] Usado em todas as rotas protegidas

**Tarefas Técnicas:**
- [ ] Criar `src/shared/http/auth.ts`
- [ ] Implementar `extractAuthenticatedTenant(supabase)`
- [ ] Adicionar testes unitários
- [ ] Documentar uso no README

**Arquivos Envolvidos:**
- `src/shared/http/auth.ts`
- `src/shared/http/index.ts`

**Exemplo de Uso:**
```typescript
const supabase = createClient();
const { userId, tenantId } = await extractAuthenticatedTenant(supabase);
```

---

## Dependências

**Bloqueia:**
- Épico 02 (CRUD Core) - precisa de auth
- Épico 03 (Kanban) - precisa de usuários
- Épico 04 (AI Scribe) - precisa de org context

**Depende de:**
- Nenhum (épico fundacional)

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Complexidade do RLS | Média | Alto | Começar com policies simples, testar muito |
| OAuth futuro | Baixa | Médio | Deixar estrutura preparada |
| Performance do RLS | Baixa | Médio | Índices adequados + queries otimizadas |

---

## Métricas de Sucesso

- [ ] Usuário consegue fazer signup/login
- [ ] Dados isolados por organização
- [ ] Zero queries cross-tenant bem-sucedidas
- [ ] Tempo de autenticação < 1s

---

## Referências

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- `docs/architecture/overview.md`
