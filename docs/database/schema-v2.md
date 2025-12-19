---
tags: [database, schema, postgresql, critical]
priority: critical
last-updated: 2025-12-18
version: "2.1"
---

# 🗄️ Database Schema v2.1 - Jira Killer

> Schema PostgreSQL otimizado para Multi-tenant + Performance
> 
> **VERSÃO ATUAL**: Use este arquivo para criar o schema via MCP Supabase
> 
> **SPEC DE IMPLEMENTAÇÃO**: Ver [IMPLEMENTATION-SPEC.md](./IMPLEMENTATION-SPEC.md) para guia passo-a-passo

---

## 📜 Changelog & Histórico de Decisões

### v2.1 (2025-12-18) - Hardening & Audit Fixes
- ✅ **FIX**: Adicionado `FOR UPDATE` lock em `set_task_local_id()` para evitar race condition
- ✅ **FIX**: Documentado warning sobre ordem alfabética de triggers no PostgreSQL
- ✅ **ADD**: Índice `idx_comments_task_created` para ordenação cronológica
- ✅ **ADD**: Seção "Known Limitations & Warnings" com documentação de riscos conhecidos
- ✅ **ADD**: Função placeholder `propagate_org_id_from_session()` para extensibilidade futura
- ✅ **DOC**: Criado IMPLEMENTATION-SPEC.md com guia detalhado para execução via MCP Supabase

### v2.0 (2025-12-18) - Critical Patches (External Review)
- ✅ **ADD**: Tabela `comments` para colaboração nas tasks (Migration 016)
- ✅ **ADD**: Coluna `local_id` em tasks para IDs amigáveis (APP-1, APP-2)
- ✅ **ADD**: Coluna `project_id` denormalizada em tasks (para local_id + queries)
- ✅ **ADD**: Trigger `set_task_local_id()` para auto-increment por projeto (Migration 015)
- ✅ **ADD**: Constraint `unique(project_id, local_id)` para garantir unicidade
- ✅ **FIX**: Trigger `propagate_ids_to_task()` agora propaga org_id E project_id

### v1.0 (2025-12-18) - Initial Schema
- ✅ Schema inicial com 14 migrations
- ✅ Multi-tenancy via RLS com org_id denormalizado
- ✅ Hierarquia: Organization → Project → Epic → Feature → Task
- ✅ ENUMs para type-safety (status, priority, type, role)
- ✅ Triggers para updated_at e propagação de org_id
- ✅ Planning Poker (sessions + votes)
- ✅ Project Docs (contexto para IA)

### Decisões Arquiteturais Registradas

| Data | Decisão | Alternativa Descartada | Justificativa |
|------|---------|------------------------|---------------|
| 2025-12-18 | org_id denormalizado em todas as tabelas | JOIN para buscar org_id | RLS em O(1) vs O(n) - performance crítica |
| 2025-12-18 | local_id sequencial por projeto | UUID como ID visível | Standups usam "APP-1", não UUIDs |
| 2025-12-18 | FOR UPDATE lock no local_id | Sequence por projeto | Sequences requerem DDL dinâmico |
| 2025-12-18 | auth.user_org_id() STABLE | JWT custom claims | MVP simplificado, otimizar depois |
| 2025-12-18 | Markdown em TEXT | Storage buckets | Memória da IA, sem necessidade de arquivos |
| 2025-12-18 | Comments sem soft-delete | Soft-delete | MVP, adicionar depois se necessário |

## Decisões Arquiteturais

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| **Multi-tenancy** | Row Level Security (RLS) | Isolamento por `org_id` em todas as tabelas |
| **org_id denormalizado** | ✅ Sim | RLS em O(1) sem JOINs - crítico para performance |
| **UUID generation** | `gen_random_uuid()` | Nativo Postgres 13+, recomendado pelo Supabase |
| **Enums vs TEXT** | ENUM types | Type-safety no banco, validação automática |
| **Soft Delete** | ❌ Não (MVP) | Simplifica, adicionar depois se necessário |
| **Project Docs** | TEXT puro | Sem Storage/Buckets - memória da IA |
| **Módulos** | Array `text[]` | Sem tabela relacional separada |

---

## Hierarquia de Entidades

```
Organization (Tenant)
├── User Profiles (extensão de auth.users)
└── Projects
    ├── Project Docs (AI Context)
    └── Epics
        └── Features
            └── Tasks/Bugs (com local_id = ID amigável)
                ├── Comments (colaboração)
                └── Poker Sessions
                    └── Poker Votes
```

---

## Diagrama ER

```
┌─────────────────┐
│  organizations  │
│─────────────────│
│ id (PK)         │
│ name            │
│ slug (UNIQUE)   │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐  ┌──────────────┐
│ projects│  │ user_profiles│
│─────────│  │──────────────│
│ id (PK) │  │ id (PK/FK)   │◄──── auth.users
│ org_id  │  │ org_id (FK)  │
│ name    │  │ display_name │
│ key     │  │ role         │
│ modules │  └──────────────┘
└────┬────┘
     │
     ├─────────────────┐
     │                 │
     ▼                 ▼
┌──────────┐    ┌─────────────┐
│  epics   │    │ project_docs│
│──────────│    │─────────────│
│ id (PK)  │    │ id (PK)     │
│ org_id   │    │ org_id      │
│project_id│    │ project_id  │
│ title    │    │ title       │
│ status   │    │ content     │
└────┬─────┘    └─────────────┘
     │
     ▼
┌──────────┐
│ features │
│──────────│
│ id (PK)  │
│ org_id   │
│ epic_id  │
│ title    │
│ status   │
└────┬─────┘
     │
     ▼
┌──────────────┐
│    tasks     │
│──────────────│
│ id (PK)      │
│ org_id       │
│ project_id   │◄──── (denormalizado)
│ feature_id   │
│ local_id     │◄──── ID amigável (1, 2, 3...)
│ title        │
│ status       │
│ type         │
│ priority     │
│ points       │
│ module       │
│ assignee_id  │◄──── auth.users
└──────┬───────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌────────────────┐  ┌──────────┐
│ poker_sessions │  │ comments │
│────────────────│  │──────────│
│ id (PK)        │  │ id (PK)  │
│ org_id         │  │ org_id   │
│ task_id (UQ)   │  │ task_id  │
│ status         │  │ user_id  │◄──── auth.users
│ created_by     │  │ content  │
└───────┬────────┘  └──────────┘
        │
        ▼
┌─────────────┐
│ poker_votes │
│─────────────│
│ id (PK)     │
│ session_id  │
│ user_id     │◄──── auth.users
│ vote        │
└─────────────┘

ID Amigável = projects.key + '-' + tasks.local_id
Ex: APP-1, APP-2, SDK-1, SDK-2...
```

---

## Schema SQL Completo

### Migration 001: Extensions

```sql
-- ============================================
-- MIGRATION 001: Extensions
-- ============================================
create extension if not exists "pgcrypto";
```

### Migration 002: Enum Types

```sql
-- ============================================
-- MIGRATION 002: Enum Types
-- ============================================

-- User roles na organização
create type user_role as enum ('OWNER', 'ADMIN', 'MEMBER');

-- Status de Epic
create type epic_status as enum ('OPEN', 'CLOSED');

-- Status de Feature
create type feature_status as enum ('BACKLOG', 'TODO', 'DOING', 'DONE');

-- Status de Task (workflow rígido)
create type task_status as enum ('BACKLOG', 'TODO', 'DOING', 'REVIEW', 'QA_READY', 'DONE');

-- Tipo de Task
create type task_type as enum ('TASK', 'BUG');

-- Prioridade
create type task_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Status do Poker
create type poker_status as enum ('VOTING', 'REVEALED', 'CLOSED');
```

### Migration 003: Organizations

```sql
-- ============================================
-- MIGRATION 003: Organizations (Tenant)
-- ============================================
create table organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_organizations_slug on organizations(slug);

comment on table organizations is 'Tenant principal - cada empresa é uma organização';
comment on column organizations.slug is 'Identificador URL-friendly único (ex: acme-corp)';
```

### Migration 004: User Profiles

```sql
-- ============================================
-- MIGRATION 004: User Profiles
-- ============================================
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) not null,
  display_name text,
  avatar_url text,
  role user_role default 'MEMBER' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_user_profiles_org on user_profiles(org_id);

comment on table user_profiles is 'Extensão de auth.users com dados de perfil e org';
comment on column user_profiles.role is 'Papel do usuário na organização';
```

### Migration 005: Projects

```sql
-- ============================================
-- MIGRATION 005: Projects
-- ============================================
create table projects (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  key text not null,
  description text,
  modules text[] default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  
  unique(org_id, key)
);

create index idx_projects_org on projects(org_id);

comment on table projects is 'Projetos/Produtos dentro de uma organização';
comment on column projects.key is 'Prefixo curto para IDs (ex: APP-123)';
comment on column projects.modules is 'Contextos técnicos (SDK, API, WEB, etc)';
```

### Migration 006: Project Docs

```sql
-- ============================================
-- MIGRATION 006: Project Docs (AI Context)
-- ============================================
create table project_docs (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  title text not null,
  content text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_project_docs_project on project_docs(project_id);
create index idx_project_docs_org on project_docs(org_id);

comment on table project_docs is 'Documentação do projeto - contexto para IA';
comment on column project_docs.content is 'Markdown armazenado diretamente (sem Storage)';
```

### Migration 007: Epics

```sql
-- ============================================
-- MIGRATION 007: Epics
-- ============================================
create table epics (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  title text not null,
  description text,
  status epic_status default 'OPEN' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_epics_project on epics(project_id);
create index idx_epics_org on epics(org_id);
create index idx_epics_status on epics(status) where status = 'OPEN';

comment on table epics is 'Objetivos macro de negócio';
```

### Migration 008: Features

```sql
-- ============================================
-- MIGRATION 008: Features
-- ============================================
create table features (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  epic_id uuid references epics(id) on delete cascade not null,
  title text not null,
  description text,
  status feature_status default 'BACKLOG' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_features_epic on features(epic_id);
create index idx_features_org on features(org_id);
create index idx_features_status on features(status);

comment on table features is 'Entregáveis funcionais - agrupam tasks';
```

### Migration 009: Tasks

```sql
-- ============================================
-- MIGRATION 009: Tasks & Bugs
-- ============================================
create table tasks (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null, -- Denormalizado para local_id e queries
  feature_id uuid references features(id) on delete cascade not null,
  local_id integer not null, -- ID sequencial por projeto (APP-1, APP-2...)
  title text not null,
  description text,
  status task_status default 'BACKLOG' not null,
  type task_type default 'TASK' not null,
  priority task_priority default 'MEDIUM' not null,
  points smallint check (points is null or points in (1, 2, 3, 5, 8, 13, 21)),
  module text,
  assignee_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  
  -- Garante ID único por projeto (APP-1 só existe uma vez)
  unique(project_id, local_id)
);

create index idx_tasks_feature on tasks(feature_id);
create index idx_tasks_org on tasks(org_id);
create index idx_tasks_project on tasks(project_id);
create index idx_tasks_assignee_status on tasks(assignee_id, status);
create index idx_tasks_module on tasks(module) where module is not null;
create index idx_tasks_bugs on tasks(org_id, status) where type = 'BUG';
-- Índice para buscar por ID amigável (ex: buscar "102" no projeto)
create index idx_tasks_project_local_id on tasks(project_id, local_id);

comment on table tasks is 'Unidade de trabalho indivisível (Task ou Bug)';
comment on column tasks.local_id is 'ID sequencial por projeto - forma o ID amigável (APP-1, APP-2)';
comment on column tasks.project_id is 'Denormalizado do feature→epic→project para performance';
comment on column tasks.points is 'Story points - apenas valores Fibonacci';
comment on column tasks.module is 'Contexto técnico - deve existir em projects.modules';
```

### Migration 010: Poker Sessions

```sql
-- ============================================
-- MIGRATION 010: Poker Sessions
-- ============================================
create table poker_sessions (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete cascade not null unique,
  status poker_status default 'VOTING' not null,
  created_by uuid references auth.users(id) not null,
  revealed_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_poker_sessions_task on poker_sessions(task_id);
create index idx_poker_sessions_org on poker_sessions(org_id);

comment on table poker_sessions is 'Sessão de Planning Poker para uma task';
comment on column poker_sessions.status is 'VOTING=aberta, REVEALED=mostrando, CLOSED=finalizada';
```

### Migration 011: Poker Votes

```sql
-- ============================================
-- MIGRATION 011: Poker Votes
-- ============================================
create table poker_votes (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references poker_sessions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  vote smallint not null check (vote in (0, 1, 2, 3, 5, 8, 13, 21)),
  created_at timestamptz default now() not null,
  
  unique(session_id, user_id)
);

create index idx_poker_votes_session on poker_votes(session_id);

comment on table poker_votes is 'Votos individuais em uma sessão de poker';
comment on column poker_votes.vote is '0 representa "?" (não sei estimar)';
```

### Migration 012: Triggers - Updated At

```sql
-- ============================================
-- MIGRATION 012: Triggers - Auto Updated At
-- ============================================

-- Função genérica
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Aplicar em todas as tabelas
create trigger trg_organizations_updated_at 
  before update on organizations
  for each row execute function update_updated_at();

create trigger trg_user_profiles_updated_at 
  before update on user_profiles
  for each row execute function update_updated_at();

create trigger trg_projects_updated_at 
  before update on projects
  for each row execute function update_updated_at();

create trigger trg_project_docs_updated_at 
  before update on project_docs
  for each row execute function update_updated_at();

create trigger trg_epics_updated_at 
  before update on epics
  for each row execute function update_updated_at();

create trigger trg_features_updated_at 
  before update on features
  for each row execute function update_updated_at();

create trigger trg_tasks_updated_at 
  before update on tasks
  for each row execute function update_updated_at();

create trigger trg_poker_sessions_updated_at 
  before update on poker_sessions
  for each row execute function update_updated_at();
```

### Migration 013: Triggers - Propagate Org ID

```sql
-- ============================================
-- MIGRATION 013: Triggers - Propagate Org ID
-- ============================================

-- Propaga org_id do Project para filhos
create or replace function propagate_org_id_from_project()
returns trigger as $$
begin
  if new.org_id is null then
    new.org_id := (select org_id from projects where id = new.project_id);
  end if;
  return new;
end;
$$ language plpgsql;

-- Propaga org_id do Epic para Features
create or replace function propagate_org_id_from_epic()
returns trigger as $$
begin
  if new.org_id is null then
    new.org_id := (select org_id from epics where id = new.epic_id);
  end if;
  return new;
end;
$$ language plpgsql;

-- Propaga org_id e project_id da Feature para Tasks
create or replace function propagate_ids_to_task()
returns trigger as $$
declare
  v_org_id uuid;
  v_project_id uuid;
begin
  -- Buscar org_id e project_id via feature → epic → project
  select e.org_id, e.project_id 
  into v_org_id, v_project_id
  from features f
  join epics e on e.id = f.epic_id
  where f.id = new.feature_id;
  
  if new.org_id is null then
    new.org_id := v_org_id;
  end if;
  
  if new.project_id is null then
    new.project_id := v_project_id;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Propaga org_id da Task para Poker Sessions
create or replace function propagate_org_id_from_task()
returns trigger as $$
begin
  if new.org_id is null then
    new.org_id := (select org_id from tasks where id = new.task_id);
  end if;
  return new;
end;
$$ language plpgsql;

-- Triggers de propagação
create trigger trg_epics_propagate_org 
  before insert on epics
  for each row execute function propagate_org_id_from_project();

create trigger trg_project_docs_propagate_org 
  before insert on project_docs
  for each row execute function propagate_org_id_from_project();

create trigger trg_features_propagate_org 
  before insert on features
  for each row execute function propagate_org_id_from_epic();

create trigger trg_tasks_propagate_ids 
  before insert on tasks
  for each row execute function propagate_ids_to_task();

create trigger trg_poker_sessions_propagate_org 
  before insert on poker_sessions
  for each row execute function propagate_org_id_from_task();

-- Propaga org_id da Session para Votes (via session → task → org)
create or replace function propagate_org_id_from_session()
returns trigger as $$
begin
  -- Não precisa de org_id em poker_votes pois RLS usa JOIN
  -- Mas se futuramente adicionarmos, esta função está pronta
  return new;
end;
$$ language plpgsql;
```

### Migration 014: RLS Policies

```sql
-- ============================================
-- MIGRATION 014: RLS Policies
-- ============================================

-- Habilitar RLS em todas as tabelas
alter table organizations enable row level security;
alter table user_profiles enable row level security;
alter table projects enable row level security;
alter table project_docs enable row level security;
alter table epics enable row level security;
alter table features enable row level security;
alter table tasks enable row level security;
alter table poker_sessions enable row level security;
alter table poker_votes enable row level security;

-- Helper: Obter org_id do usuário logado
create or replace function auth.user_org_id()
returns uuid as $$
  select org_id from user_profiles where id = auth.uid()
$$ language sql security definer stable;

-- ============================================
-- POLICIES: Organizations
-- ============================================
create policy "Users can view own organization"
  on organizations for select
  using (id = auth.user_org_id());

-- ============================================
-- POLICIES: User Profiles
-- ============================================
create policy "Users can view profiles in same org"
  on user_profiles for select
  using (org_id = auth.user_org_id());

create policy "Users can update own profile"
  on user_profiles for update
  using (id = auth.uid());

-- ============================================
-- POLICIES: Projects (template para todas as tabelas com org_id)
-- ============================================
create policy "Users can view projects in own org"
  on projects for select
  using (org_id = auth.user_org_id());

create policy "Users can insert projects in own org"
  on projects for insert
  with check (org_id = auth.user_org_id());

create policy "Users can update projects in own org"
  on projects for update
  using (org_id = auth.user_org_id());

create policy "Users can delete projects in own org"
  on projects for delete
  using (org_id = auth.user_org_id());

-- ============================================
-- POLICIES: Project Docs
-- ============================================
create policy "Users can view project_docs in own org"
  on project_docs for select
  using (org_id = auth.user_org_id());

create policy "Users can insert project_docs in own org"
  on project_docs for insert
  with check (org_id = auth.user_org_id());

create policy "Users can update project_docs in own org"
  on project_docs for update
  using (org_id = auth.user_org_id());

create policy "Users can delete project_docs in own org"
  on project_docs for delete
  using (org_id = auth.user_org_id());

-- ============================================
-- POLICIES: Epics
-- ============================================
create policy "Users can view epics in own org"
  on epics for select
  using (org_id = auth.user_org_id());

create policy "Users can insert epics in own org"
  on epics for insert
  with check (org_id = auth.user_org_id());

create policy "Users can update epics in own org"
  on epics for update
  using (org_id = auth.user_org_id());

create policy "Users can delete epics in own org"
  on epics for delete
  using (org_id = auth.user_org_id());

-- ============================================
-- POLICIES: Features
-- ============================================
create policy "Users can view features in own org"
  on features for select
  using (org_id = auth.user_org_id());

create policy "Users can insert features in own org"
  on features for insert
  with check (org_id = auth.user_org_id());

create policy "Users can update features in own org"
  on features for update
  using (org_id = auth.user_org_id());

create policy "Users can delete features in own org"
  on features for delete
  using (org_id = auth.user_org_id());

-- ============================================
-- POLICIES: Tasks
-- ============================================
create policy "Users can view tasks in own org"
  on tasks for select
  using (org_id = auth.user_org_id());

create policy "Users can insert tasks in own org"
  on tasks for insert
  with check (org_id = auth.user_org_id());

create policy "Users can update tasks in own org"
  on tasks for update
  using (org_id = auth.user_org_id());

create policy "Users can delete tasks in own org"
  on tasks for delete
  using (org_id = auth.user_org_id());

-- ============================================
-- POLICIES: Poker Sessions
-- ============================================
create policy "Users can view poker_sessions in own org"
  on poker_sessions for select
  using (org_id = auth.user_org_id());

create policy "Users can insert poker_sessions in own org"
  on poker_sessions for insert
  with check (org_id = auth.user_org_id());

create policy "Users can update poker_sessions in own org"
  on poker_sessions for update
  using (org_id = auth.user_org_id());

create policy "Users can delete poker_sessions in own org"
  on poker_sessions for delete
  using (org_id = auth.user_org_id());

-- ============================================
-- POLICIES: Poker Votes
-- ============================================
create policy "Users can view votes in accessible sessions"
  on poker_votes for select
  using (
    exists (
      select 1 from poker_sessions ps
      where ps.id = poker_votes.session_id
      and ps.org_id = auth.user_org_id()
    )
  );

create policy "Users can insert own votes"
  on poker_votes for insert
  with check (user_id = auth.uid());

create policy "Users can update own votes"
  on poker_votes for update
  using (user_id = auth.uid());

create policy "Users can delete own votes"
  on poker_votes for delete
  using (user_id = auth.uid());
```

### Migration 015: Task Local ID (Human Readable)

```sql
-- ============================================
-- MIGRATION 015: Auto-increment local_id por Projeto
-- Gera IDs amigáveis: APP-1, APP-2, SDK-1, SDK-2...
-- ============================================

-- Função para gerar local_id sequencial por projeto
-- IMPORTANTE: Usa LOCK para evitar race condition em inserts concorrentes
create or replace function set_task_local_id()
returns trigger as $$
declare
  max_id integer;
begin
  -- Lock na row do projeto para evitar race condition
  -- Múltiplos inserts simultâneos poderiam gerar mesmo local_id
  perform id from projects where id = new.project_id for update;
  
  -- Pega o maior local_id atual deste projeto
  -- Se não existir nenhuma task, começa do 0
  select coalesce(max(local_id), 0) into max_id
  from tasks
  where project_id = new.project_id;
  
  new.local_id := max_id + 1;
  return new;
end;
$$ language plpgsql;

-- Trigger ANTES do insert (após propagate_ids que define project_id)
create trigger trg_tasks_set_local_id
  before insert on tasks
  for each row
  execute function set_task_local_id();

-- ⚠️ IMPORTANTE: Ordem dos triggers no PostgreSQL
-- PostgreSQL executa BEFORE INSERT triggers em ordem ALFABÉTICA por nome!
-- 1. trg_tasks_propagate_ids (p < s, executa primeiro → define project_id)
-- 2. trg_tasks_set_local_id (s > p, executa segundo → usa project_id)
-- VERIFICADO: "propagate" vem antes de "set" alfabeticamente ✓
-- Se renomear triggers, GARANTIR que propagate execute ANTES de set_local_id

comment on function set_task_local_id() is 
  'Gera ID sequencial por projeto para IDs amigáveis (APP-1, APP-2...)';
```

### Migration 016: Comments (Colaboração)

```sql
-- ============================================
-- MIGRATION 016: Comments (Discussão nas Tasks)
-- ============================================
create table comments (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  content text not null, -- Markdown suportado
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Índices
create index idx_comments_task on comments(task_id);
create index idx_comments_org on comments(org_id);
create index idx_comments_user on comments(user_id);
-- Índice para ordenação cronológica (comum em UI: mais recentes primeiro)
create index idx_comments_task_created on comments(task_id, created_at desc);

comment on table comments is 'Comentários/discussão nas tasks';
comment on column comments.content is 'Markdown suportado para formatação';

-- Trigger updated_at
create trigger trg_comments_updated_at
  before update on comments
  for each row execute function update_updated_at();

-- Trigger para propagar org_id da task
create trigger trg_comments_propagate_org
  before insert on comments
  for each row execute function propagate_org_id_from_task();

-- RLS
alter table comments enable row level security;

create policy "Users can view comments in own org"
  on comments for select
  using (org_id = auth.user_org_id());

create policy "Users can insert comments in own org"
  on comments for insert
  with check (org_id = auth.user_org_id() and user_id = auth.uid());

create policy "Users can update own comments"
  on comments for update
  using (user_id = auth.uid());

create policy "Users can delete own comments"
  on comments for delete
  using (user_id = auth.uid());
```

---

## Checklist de Implementação

### Ordem de Execução das Migrations

- [ ] 001: Extensions (`pgcrypto`)
- [ ] 002: Enum Types (todos os enums)
- [ ] 003: Organizations
- [ ] 004: User Profiles
- [ ] 005: Projects
- [ ] 006: Project Docs
- [ ] 007: Epics
- [ ] 008: Features
- [ ] 009: Tasks
- [ ] 010: Poker Sessions
- [ ] 011: Poker Votes
- [ ] 012: Triggers - Updated At
- [ ] 013: Triggers - Propagate IDs
- [ ] 014: RLS Policies
- [ ] 015: Task Local ID (Human Readable)
- [ ] 016: Comments

### Validações Pós-Migration

- [ ] Testar criação de organização
- [ ] Testar criação de user_profile vinculado a auth.users
- [ ] Testar propagação automática de org_id e project_id
- [ ] Testar geração automática de local_id (APP-1, APP-2...)
- [ ] Testar updated_at automático
- [ ] Testar isolamento RLS entre orgs
- [ ] Testar constraint Fibonacci em points
- [ ] Testar unique(org_id, key) em projects
- [ ] Testar unique(project_id, local_id) em tasks
- [ ] Testar criação de comentário em task

---

## ⚠️ Known Limitations & Warnings

### Race Conditions
- **local_id generation**: Usa `FOR UPDATE` lock no projeto para evitar duplicatas em inserts concorrentes
- **Alto volume**: Se muitas tasks forem criadas simultaneamente no mesmo projeto, pode haver contenção

### RLS Performance
- **auth.user_org_id()**: Executa query em `user_profiles` para cada verificação RLS
- **Mitigação futura**: Considerar `auth.jwt() ->> 'org_id'` com custom claims se performance degradar
- **MVP aceitável**: Para <1000 requests/min, overhead é negligível

### Trigger Order
- PostgreSQL executa triggers BEFORE INSERT em **ordem alfabética** por nome
- `trg_tasks_propagate_ids` deve executar ANTES de `trg_tasks_set_local_id`
- **VERIFICADO**: "propagate" < "set" alfabeticamente ✓

### Pontos de Fibonacci
- Constraint `CHECK` valida apenas valores: 1, 2, 3, 5, 8, 13, 21
- `NULL` é permitido (task não estimada)
- `0` não é permitido em tasks, mas `0` em poker_votes significa "não sei estimar"

---

## Comandos MCP Supabase

```bash
# Listar migrations existentes
mcp supabase migration list

# Criar nova migration
mcp supabase migration new nome_da_migration

# Aplicar migrations
mcp supabase db push

# Reset do banco (CUIDADO: apaga tudo)
mcp supabase db reset

# Ver status do Supabase
mcp supabase status
```

---

## Referências

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL ENUM Types](https://www.postgresql.org/docs/current/datatype-enum.html)
- [docs/roadmap/01-auth-multi-tenancy.md](../roadmap/01-auth-multi-tenancy.md) - Feature 1.3: RLS Policies
