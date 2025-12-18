---
tags: [database, schema, critical-business]
priority: critical
last-updated: 2025-12
---

# 🗄️ Database Schema

## Visão Geral

O banco de dados usa PostgreSQL via Supabase, com:
- Multi-tenancy via `org_id`
- RLS (Row Level Security) em todas as tabelas
- UUIDs como primary keys
- Timestamps em UTC

---

## Diagrama ER

```
┌──────────────────┐
│  organizations   │
├──────────────────┤
│ id (PK)          │
│ name             │
│ created_at       │
└────────┬─────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐
│    projects      │
├──────────────────┤
│ id (PK)          │
│ org_id (FK)      │◄─────────────────────────────────────┐
│ name             │                                      │
│ key              │                                      │
│ modules[]        │                                      │
│ created_at       │                                      │
└────────┬─────────┘                                      │
         │                                                │
    ┌────┴────┐                                           │
    │         │                                           │
    ▼         ▼                                           │
┌─────────┐ ┌──────────────┐                              │
│  epics  │ │ project_docs │                              │
├─────────┤ ├──────────────┤                              │
│ id (PK) │ │ id (PK)      │                              │
│proj_id  │ │ project_id   │                              │
│ title   │ │ title        │                              │
│ desc    │ │ content      │ (Markdown TEXT)              │
│ status  │ │ created_at   │                              │
└────┬────┘ └──────────────┘                              │
     │                                                    │
     │ 1:N                                                │
     ▼                                                    │
┌──────────────┐                                          │
│   features   │                                          │
├──────────────┤                                          │
│ id (PK)      │                                          │
│ epic_id (FK) │                                          │
│ title        │                                          │
│ description  │                                          │
│ status       │                                          │
│ created_at   │                                          │
└──────┬───────┘                                          │
       │                                                  │
       │ 1:N                                              │
       ▼                                                  │
┌────────────────────┐      ┌──────────────────┐          │
│      tasks         │      │   poker_votes    │          │
├────────────────────┤      ├──────────────────┤          │
│ id (PK)            │◄────▶│ id (PK)          │          │
│ feature_id (FK)    │      │ task_id (FK)     │          │
│ title              │      │ user_id (FK)     │──────────┘
│ description        │      │ vote             │     (auth.users)
│ status             │      │ created_at       │
│ type (TASK/BUG)    │      │ UNIQUE(task,user)│
│ points             │      └──────────────────┘
│ priority           │
│ module             │ (validar contra project.modules)
│ assignee_id (FK)   │──────────────────────────────────┐
│ created_at         │                                  │
└────────────────────┘                                  │
                                                        ▼
                                               ┌──────────────┐
                                               │ auth.users   │
                                               │ (Supabase)   │
                                               └──────────────┘
```

---

## DDL Completo

```sql
-- =============================================================================
-- 0. Extensões
-- =============================================================================
create extension if not exists "pgcrypto";  -- Para gen_random_uuid()

-- =============================================================================
-- 1. Organizations (Tenants)
-- =============================================================================
create table organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now() not null
);

comment on table organizations is 'Tenants do sistema (empresas)';

-- RLS
alter table organizations enable row level security;

create policy "Users can view their own org"
  on organizations for select
  using (id = (auth.jwt()->>'org_id')::uuid);

-- =============================================================================
-- 2. Projects (Produtos)
-- =============================================================================
create table projects (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  key text not null,  -- Prefixo para IDs (ex: "APP")
  modules text[] default '{}',  -- Ex: ['SDK', 'API', 'WEB']
  created_at timestamptz default now() not null,
  
  -- Key deve ser único dentro da org
  unique(org_id, key)
);

comment on table projects is 'Produtos/projetos da organização';
comment on column projects.key is 'Prefixo para IDs de tasks (ex: APP → APP-001)';
comment on column projects.modules is 'Lista de módulos técnicos controlada pelo owner';

-- Índice
create index idx_projects_org on projects(org_id);

-- RLS
alter table projects enable row level security;

create policy "Users can view projects in their org"
  on projects for select
  using (org_id = (auth.jwt()->>'org_id')::uuid);

create policy "Users can insert projects in their org"
  on projects for insert
  with check (org_id = (auth.jwt()->>'org_id')::uuid);

create policy "Users can update projects in their org"
  on projects for update
  using (org_id = (auth.jwt()->>'org_id')::uuid);

-- =============================================================================
-- 3. Project Docs (Memória da IA)
-- =============================================================================
create table project_docs (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  title text not null,  -- Ex: "Styleguide.md"
  content text not null,  -- Markdown puro
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table project_docs is 'Documentos de contexto para o AI Scribe';
comment on column project_docs.content is 'Markdown armazenado diretamente (não usar Storage)';

-- Índice
create index idx_project_docs_project on project_docs(project_id);

-- Trigger para updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger project_docs_updated_at
  before update on project_docs
  for each row execute function update_updated_at();

-- RLS
alter table project_docs enable row level security;

create policy "Users can view docs for projects in their org"
  on project_docs for select
  using (
    exists (
      select 1 from projects p
      where p.id = project_docs.project_id
      and p.org_id = (auth.jwt()->>'org_id')::uuid
    )
  );

-- =============================================================================
-- 4. Epics (Objetivos Macro)
-- =============================================================================
create table epics (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  title text not null,
  description text,
  status text default 'TODO' check (status in ('TODO', 'IN_PROGRESS', 'DONE')),
  created_at timestamptz default now() not null
);

comment on table epics is 'Objetivos de negócio de alto nível';

-- Índice
create index idx_epics_project on epics(project_id);

-- RLS
alter table epics enable row level security;

create policy "Users can view epics for projects in their org"
  on epics for select
  using (
    exists (
      select 1 from projects p
      where p.id = epics.project_id
      and p.org_id = (auth.jwt()->>'org_id')::uuid
    )
  );

-- =============================================================================
-- 5. Features (Entregáveis)
-- =============================================================================
create table features (
  id uuid default gen_random_uuid() primary key,
  epic_id uuid references epics(id) on delete cascade not null,
  title text not null,
  description text,
  status text default 'TODO' check (status in ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE')),
  created_at timestamptz default now() not null
);

comment on table features is 'Entregáveis funcionais (agrupador de tasks)';
comment on column features.status is 'BLOCKED = tem bugs abertos';

-- Índice
create index idx_features_epic on features(epic_id);

-- RLS
alter table features enable row level security;

create policy "Users can view features for projects in their org"
  on features for select
  using (
    exists (
      select 1 from epics e
      join projects p on p.id = e.project_id
      where e.id = features.epic_id
      and p.org_id = (auth.jwt()->>'org_id')::uuid
    )
  );

-- =============================================================================
-- 6. Tasks & Bugs
-- =============================================================================
create table tasks (
  id uuid default gen_random_uuid() primary key,
  feature_id uuid references features(id) on delete cascade not null,
  key text not null,  -- Ex: "APP-001" (gerado automaticamente)
  title text not null,
  description text,  -- Markdown suportado
  status text default 'BACKLOG' check (
    status in ('BACKLOG', 'TODO', 'DOING', 'REVIEW', 'QA_READY', 'DONE')
  ),
  type text default 'TASK' check (type in ('TASK', 'BUG')),
  points integer check (points > 0),
  priority text default 'MEDIUM' check (
    priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
  ),
  module text,  -- Deve existir em project.modules
  assignee_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table tasks is 'Unidade de trabalho indivisível';
comment on column tasks.key is 'ID legível (ex: APP-001)';
comment on column tasks.type is 'TASK = desenvolvimento, BUG = defeito';
comment on column tasks.module is 'Deve existir em project.modules';

-- Índices
create index idx_tasks_feature on tasks(feature_id);
create index idx_tasks_assignee_status on tasks(assignee_id, status);
create index idx_tasks_module on tasks(module);
create index idx_tasks_type on tasks(type);
create unique index idx_tasks_key on tasks(key);

-- Trigger para updated_at
create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- RLS
alter table tasks enable row level security;

create policy "Users can view tasks for projects in their org"
  on tasks for select
  using (
    exists (
      select 1 from features f
      join epics e on e.id = f.epic_id
      join projects p on p.id = e.project_id
      where f.id = tasks.feature_id
      and p.org_id = (auth.jwt()->>'org_id')::uuid
    )
  );

-- =============================================================================
-- 7. Poker Votes (Scrum Poker)
-- =============================================================================
create table poker_votes (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  vote integer not null check (vote >= -1),  -- -1 = "?"
  created_at timestamptz default now() not null,
  
  -- Cada usuário só pode ter um voto por task
  unique(task_id, user_id)
);

comment on table poker_votes is 'Votos do Scrum Poker';
comment on column poker_votes.vote is '-1 = não sei (?), outros = story points';

-- Índice
create index idx_poker_task on poker_votes(task_id);

-- RLS
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
      and p.org_id = (auth.jwt()->>'org_id')::uuid
    )
  );

create policy "Users can manage their own votes"
  on poker_votes for all
  using (user_id = auth.uid());

-- =============================================================================
-- 8. Função para gerar Task Key
-- =============================================================================
create or replace function generate_task_key()
returns trigger as $$
declare
  project_key text;
  next_num integer;
begin
  -- Buscar o key do projeto via feature → epic → project
  select p.key into project_key
  from projects p
  join epics e on e.project_id = p.id
  join features f on f.epic_id = e.id
  where f.id = new.feature_id;
  
  -- Contar tasks existentes do projeto + 1
  select count(*) + 1 into next_num
  from tasks t
  join features f on f.id = t.feature_id
  join epics e on e.id = f.epic_id
  join projects p on p.id = e.project_id
  where p.key = project_key;
  
  -- Gerar key (ex: APP-001)
  new.key = project_key || '-' || lpad(next_num::text, 3, '0');
  
  return new;
end;
$$ language plpgsql;

create trigger tasks_generate_key
  before insert on tasks
  for each row execute function generate_task_key();

-- =============================================================================
-- 9. Função para bloquear Feature com Bugs
-- =============================================================================
create or replace function check_feature_can_be_done()
returns trigger as $$
declare
  open_bugs integer;
begin
  -- Só verifica se está tentando mover para DONE
  if new.status = 'DONE' and old.status != 'DONE' then
    select count(*) into open_bugs
    from tasks
    where feature_id = new.id
    and type = 'BUG'
    and status != 'DONE';
    
    if open_bugs > 0 then
      raise exception 'Feature não pode ser DONE com % bugs abertos', open_bugs;
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger features_check_done
  before update on features
  for each row execute function check_feature_can_be_done();
```

---

## Migrations

### Criar Nova Migration

```bash
# SEMPRE usar mcp supabase
mcp supabase migration new nome_da_migration
```

### Aplicar Migrations

```bash
mcp supabase db push
```

### Listar Migrations

```bash
mcp supabase migration list
```

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| **IDs** | UUID v4 | Distribuído, não previsível |
| **Timestamps** | timestamptz | Sempre UTC no banco |
| **Soft Delete** | Não | Simplicidade (cascade delete) |
| **Modules** | Array `text[]` | Não precisa de tabela separada |
| **Docs Storage** | TEXT no banco | Eficiência, simplicidade |
| **Task Key** | Trigger | Geração automática consistente |

---

## Ver Também

- [../architecture/domain-model.md](../architecture/domain-model.md) - Modelo de domínio
- [../guides/date-handling.md](../guides/date-handling.md) - Manipulação de datas
