---
tags: [database, implementation, spec, critical]
priority: critical
created: 2025-12-18
target-agent: sonnet-4.5
---

# 🗄️ Database Implementation Spec - Jira Killer

> **SPEC DE IMPLEMENTAÇÃO PARA AGENTE IA (Sonnet 4.5)**
>
> Este documento descreve EXATAMENTE como criar o banco de dados do Jira Killer.
> Siga cada fase NA ORDEM. Cada task é atômica - execute completamente antes de passar para a próxima.

---

## 📋 Pré-requisitos

### Ferramentas Necessárias
- MCP Supabase configurado e conectado
- Acesso ao projeto Supabase (já criado)

### Comandos MCP Supabase que você VAI usar

```bash
# Ver migrations existentes
mcp supabase migration list

# Aplicar uma migration (DDL)
mcp supabase apply_migration --name "nome_da_migration" --query "SQL AQUI"

# Executar SQL (para verificação)
mcp supabase execute_sql --query "SELECT * FROM ..."
```

### ⚠️ REGRAS CRÍTICAS

1. **NUNCA** execute múltiplas migrations em um só comando
2. **SEMPRE** verifique se a migration anterior foi aplicada antes de prosseguir
3. **NUNCA** pule uma task - a ordem é crítica
4. **SEMPRE** use os nomes de migration EXATAMENTE como especificado
5. **COPIE** o SQL exatamente como está no schema-v2.md - não modifique

---

## Fase 1: Fundação (Extensions + Types)

> **Objetivo**: Criar extensões e tipos ENUM que serão usados em todas as tabelas.
> **Dependências**: Nenhuma
> **Validação**: `SELECT * FROM pg_type WHERE typname LIKE '%_status%'` deve retornar 4 tipos

### Task 1.1: Criar Extension pgcrypto

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 001

**Comando MCP**:
```
mcp supabase apply_migration --name "001_extensions" --query "create extension if not exists \"pgcrypto\";"
```

**Validação**:
```sql
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
```

**Resultado esperado**: 1 row retornada

---

### Task 1.2: Criar ENUM user_role

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 002 (primeira parte)

**Comando MCP**:
```
mcp supabase apply_migration --name "002_enum_user_role" --query "create type user_role as enum ('OWNER', 'ADMIN', 'MEMBER');"
```

**Validação**:
```sql
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype;
```

**Resultado esperado**: 3 rows (OWNER, ADMIN, MEMBER)

---

### Task 1.3: Criar ENUMs de Status (epic, feature, task, poker)

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 002 (segunda parte)

**Comando MCP**:
```
mcp supabase apply_migration --name "003_enum_statuses" --query "
create type epic_status as enum ('OPEN', 'CLOSED');
create type feature_status as enum ('BACKLOG', 'TODO', 'DOING', 'DONE');
create type task_status as enum ('BACKLOG', 'TODO', 'DOING', 'REVIEW', 'QA_READY', 'DONE');
create type poker_status as enum ('VOTING', 'REVEALED', 'CLOSED');
"
```

**Validação**:
```sql
SELECT typname FROM pg_type WHERE typname IN ('epic_status', 'feature_status', 'task_status', 'poker_status');
```

**Resultado esperado**: 4 rows

---

### Task 1.4: Criar ENUMs de Task (type, priority)

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 002 (terceira parte)

**Comando MCP**:
```
mcp supabase apply_migration --name "004_enum_task_attrs" --query "
create type task_type as enum ('TASK', 'BUG');
create type task_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
"
```

**Validação**:
```sql
SELECT typname FROM pg_type WHERE typname IN ('task_type', 'task_priority');
```

**Resultado esperado**: 2 rows

---

### Task 1.5: Validar Fase 1 Completa

**Não é um comando MCP** - apenas validação.

**Query de validação completa**:
```sql
SELECT typname FROM pg_type 
WHERE typname IN ('user_role', 'epic_status', 'feature_status', 'task_status', 'poker_status', 'task_type', 'task_priority')
ORDER BY typname;
```

**Resultado esperado**: 7 rows listando todos os ENUMs

**✅ CHECKPOINT**: Se validação passou, prossiga para Fase 2.

---

## Fase 2: Tabelas Core (Organizations + Users + Projects)

> **Objetivo**: Criar as 3 tabelas principais que formam a base do multi-tenancy.
> **Dependências**: Fase 1 completa
> **Validação**: 3 tabelas criadas com índices corretos

### Task 2.1: Criar Tabela organizations

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 003

**Comando MCP**:
```
mcp supabase apply_migration --name "005_table_organizations" --query "
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
"
```

**Validação**:
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public';
```

**Resultado esperado**: 1 row

---

### Task 2.2: Criar Tabela user_profiles

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 004

**⚠️ ATENÇÃO**: Esta tabela referencia `auth.users` que é gerenciada pelo Supabase Auth.

**Comando MCP**:
```
mcp supabase apply_migration --name "006_table_user_profiles" --query "
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
"
```

**Validação**:
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_profiles' ORDER BY ordinal_position;
```

**Resultado esperado**: 7 colunas (id, org_id, display_name, avatar_url, role, created_at, updated_at)

---

### Task 2.3: Criar Tabela projects

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 005

**Comando MCP**:
```
mcp supabase apply_migration --name "007_table_projects" --query "
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
"
```

**Validação**:
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'projects';
```

**Resultado esperado**: Pelo menos 2 índices (pk + idx_projects_org)

---

### Task 2.4: Criar Tabela project_docs

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 006

**Comando MCP**:
```
mcp supabase apply_migration --name "008_table_project_docs" --query "
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
"
```

**Validação**:
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'project_docs';
```

**Resultado esperado**: 1 row

---

### Task 2.5: Validar Fase 2 Completa

**Query de validação completa**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('organizations', 'user_profiles', 'projects', 'project_docs')
ORDER BY table_name;
```

**Resultado esperado**: 4 rows

**Testar constraint unique(org_id, key)** - este deve FALHAR:
```sql
-- NÃO EXECUTE ISSO - apenas para documentação
-- INSERT INTO projects (org_id, key, name) VALUES ('uuid', 'APP', 'Test1');
-- INSERT INTO projects (org_id, key, name) VALUES ('uuid', 'APP', 'Test2'); -- DEVE FALHAR
```

**✅ CHECKPOINT**: Se validação passou, prossiga para Fase 3.

---

## Fase 3: Tabelas Hierárquicas (Epics + Features + Tasks)

> **Objetivo**: Criar a hierarquia Epic → Feature → Task que forma o core do produto.
> **Dependências**: Fase 2 completa
> **Validação**: 3 tabelas criadas com constraints corretas

### Task 3.1: Criar Tabela epics

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 007

**Comando MCP**:
```
mcp supabase apply_migration --name "009_table_epics" --query "
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
"
```

**Validação**:
```sql
SELECT column_name, udt_name FROM information_schema.columns WHERE table_name = 'epics' AND column_name = 'status';
```

**Resultado esperado**: udt_name = 'epic_status'

---

### Task 3.2: Criar Tabela features

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 008

**Comando MCP**:
```
mcp supabase apply_migration --name "010_table_features" --query "
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
"
```

**Validação**:
```sql
SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'features' AND constraint_type = 'FOREIGN KEY';
```

**Resultado esperado**: 2 FKs (organizations, epics)

---

### Task 3.3: Criar Tabela tasks

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 009

**⚠️ ATENÇÃO**: Esta é a tabela mais complexa. Copie EXATAMENTE.

**Comando MCP**:
```
mcp supabase apply_migration --name "011_table_tasks" --query "
create table tasks (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  feature_id uuid references features(id) on delete cascade not null,
  local_id integer not null,
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
  
  unique(project_id, local_id)
);

create index idx_tasks_feature on tasks(feature_id);
create index idx_tasks_org on tasks(org_id);
create index idx_tasks_project on tasks(project_id);
create index idx_tasks_assignee_status on tasks(assignee_id, status);
create index idx_tasks_module on tasks(module) where module is not null;
create index idx_tasks_bugs on tasks(org_id, status) where type = 'BUG';
create index idx_tasks_project_local_id on tasks(project_id, local_id);

comment on table tasks is 'Unidade de trabalho indivisível (Task ou Bug)';
comment on column tasks.local_id is 'ID sequencial por projeto - forma o ID amigável (APP-1, APP-2)';
comment on column tasks.project_id is 'Denormalizado do feature→epic→project para performance';
comment on column tasks.points is 'Story points - apenas valores Fibonacci';
comment on column tasks.module is 'Contexto técnico - deve existir em projects.modules';
"
```

**Validação**:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position;
```

**Resultado esperado**: 15 colunas

**Validar constraint Fibonacci**:
```sql
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'tasks'::regclass AND contype = 'c';
```

**Resultado esperado**: CHECK constraint com valores (1, 2, 3, 5, 8, 13, 21)

---

### Task 3.4: Criar Tabela comments

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 016

**Comando MCP**:
```
mcp supabase apply_migration --name "012_table_comments" --query "
create table comments (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  content text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_comments_task on comments(task_id);
create index idx_comments_org on comments(org_id);
create index idx_comments_user on comments(user_id);
create index idx_comments_task_created on comments(task_id, created_at desc);

comment on table comments is 'Comentários/discussão nas tasks';
comment on column comments.content is 'Markdown suportado para formatação';
"
```

**Validação**:
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'comments';
```

**Resultado esperado**: 5 índices (pk + 4 criados)

---

### Task 3.5: Validar Fase 3 Completa

**Query de validação completa**:
```sql
SELECT table_name, 
       (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as col_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('epics', 'features', 'tasks', 'comments')
ORDER BY table_name;
```

**Resultado esperado**:
- comments: 7 colunas
- epics: 8 colunas
- features: 8 colunas
- tasks: 15 colunas

**✅ CHECKPOINT**: Se validação passou, prossiga para Fase 4.

---

## Fase 4: Tabelas Poker (Sessions + Votes)

> **Objetivo**: Criar as tabelas do módulo de Planning Poker.
> **Dependências**: Fase 3 completa (tasks existe)
> **Validação**: 2 tabelas criadas com constraints corretas

### Task 4.1: Criar Tabela poker_sessions

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 010

**Comando MCP**:
```
mcp supabase apply_migration --name "013_table_poker_sessions" --query "
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
"
```

**Validação**:
```sql
SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'poker_sessions' AND constraint_type = 'UNIQUE';
```

**Resultado esperado**: 1 row (task_id unique - apenas 1 sessão por task)

---

### Task 4.2: Criar Tabela poker_votes

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 011

**Comando MCP**:
```
mcp supabase apply_migration --name "014_table_poker_votes" --query "
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
comment on column poker_votes.vote is '0 representa \"?\" (não sei estimar)';
"
```

**Validação**:
```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'poker_votes'::regclass AND contype = 'c';
```

**Resultado esperado**: CHECK constraint incluindo `0` (diferente de tasks que não permite 0)

---

### Task 4.3: Validar Fase 4 Completa

**Query de validação completa**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('poker_sessions', 'poker_votes')
ORDER BY table_name;
```

**Resultado esperado**: 2 rows

**✅ CHECKPOINT**: Se validação passou, prossiga para Fase 5.

---

### Task 4.4: (RESERVADO)

*Esta task está reservada para futuras adições à Fase 4.*

---

### Task 4.5: (RESERVADO)

*Esta task está reservada para futuras adições à Fase 4.*

---

## Fase 5: Triggers - Updated At

> **Objetivo**: Criar triggers que atualizam automaticamente `updated_at` em todas as tabelas.
> **Dependências**: Fases 2, 3, 4 completas
> **Validação**: 9 triggers criados

### Task 5.1: Criar Função update_updated_at()

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 012 (primeira parte)

**Comando MCP**:
```
mcp supabase apply_migration --name "015_function_updated_at" --query "
create or replace function update_updated_at()
returns trigger as \$\$
begin
  new.updated_at = now();
  return new;
end;
\$\$ language plpgsql;
"
```

**Validação**:
```sql
SELECT proname FROM pg_proc WHERE proname = 'update_updated_at';
```

**Resultado esperado**: 1 row

---

### Task 5.2: Criar Triggers Updated At - Parte 1 (organizations, user_profiles, projects)

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 012 (segunda parte)

**Comando MCP**:
```
mcp supabase apply_migration --name "016_triggers_updated_at_1" --query "
create trigger trg_organizations_updated_at 
  before update on organizations
  for each row execute function update_updated_at();

create trigger trg_user_profiles_updated_at 
  before update on user_profiles
  for each row execute function update_updated_at();

create trigger trg_projects_updated_at 
  before update on projects
  for each row execute function update_updated_at();
"
```

**Validação**:
```sql
SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%_updated_at' AND tgname IN ('trg_organizations_updated_at', 'trg_user_profiles_updated_at', 'trg_projects_updated_at');
```

**Resultado esperado**: 3 rows

---

### Task 5.3: Criar Triggers Updated At - Parte 2 (project_docs, epics, features)

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 012 (terceira parte)

**Comando MCP**:
```
mcp supabase apply_migration --name "017_triggers_updated_at_2" --query "
create trigger trg_project_docs_updated_at 
  before update on project_docs
  for each row execute function update_updated_at();

create trigger trg_epics_updated_at 
  before update on epics
  for each row execute function update_updated_at();

create trigger trg_features_updated_at 
  before update on features
  for each row execute function update_updated_at();
"
```

**Validação**:
```sql
SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg_%_updated_at';
```

**Resultado esperado**: 6

---

### Task 5.4: Criar Triggers Updated At - Parte 3 (tasks, poker_sessions, comments)

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 012 (quarta parte)

**Comando MCP**:
```
mcp supabase apply_migration --name "018_triggers_updated_at_3" --query "
create trigger trg_tasks_updated_at 
  before update on tasks
  for each row execute function update_updated_at();

create trigger trg_poker_sessions_updated_at 
  before update on poker_sessions
  for each row execute function update_updated_at();

create trigger trg_comments_updated_at
  before update on comments
  for each row execute function update_updated_at();
"
```

**Validação**:
```sql
SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg_%_updated_at';
```

**Resultado esperado**: 9

---

### Task 5.5: Validar Fase 5 Completa

**Query de validação completa**:
```sql
SELECT tgname, tgrelid::regclass as table_name 
FROM pg_trigger 
WHERE tgname LIKE 'trg_%_updated_at'
ORDER BY tgname;
```

**Resultado esperado**: 9 triggers, um para cada tabela (exceto poker_votes que não tem updated_at)

**✅ CHECKPOINT**: Se validação passou, prossiga para Fase 6.

---

## Fase 6: Triggers - Propagate IDs

> **Objetivo**: Criar triggers que propagam `org_id` e `project_id` automaticamente na hierarquia.
> **Dependências**: Fase 5 completa
> **Validação**: 5 funções + 5 triggers

### Task 6.1: Criar Função propagate_org_id_from_project()

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 013 (primeira parte)

**Comando MCP**:
```
mcp supabase apply_migration --name "019_function_propagate_from_project" --query "
create or replace function propagate_org_id_from_project()
returns trigger as \$\$
begin
  if new.org_id is null then
    new.org_id := (select org_id from projects where id = new.project_id);
  end if;
  return new;
end;
\$\$ language plpgsql;
"
```

**Validação**:
```sql
SELECT proname FROM pg_proc WHERE proname = 'propagate_org_id_from_project';
```

**Resultado esperado**: 1 row

---

### Task 6.2: Criar Função propagate_org_id_from_epic()

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 013 (segunda parte)

**Comando MCP**:
```
mcp supabase apply_migration --name "020_function_propagate_from_epic" --query "
create or replace function propagate_org_id_from_epic()
returns trigger as \$\$
begin
  if new.org_id is null then
    new.org_id := (select org_id from epics where id = new.epic_id);
  end if;
  return new;
end;
\$\$ language plpgsql;
"
```

**Validação**:
```sql
SELECT proname FROM pg_proc WHERE proname = 'propagate_org_id_from_epic';
```

**Resultado esperado**: 1 row

---

### Task 6.3: Criar Função propagate_ids_to_task()

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 013 (terceira parte)

**⚠️ ATENÇÃO**: Esta função propaga DOIS valores: org_id E project_id.

**Comando MCP**:
```
mcp supabase apply_migration --name "021_function_propagate_to_task" --query "
create or replace function propagate_ids_to_task()
returns trigger as \$\$
declare
  v_org_id uuid;
  v_project_id uuid;
begin
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
\$\$ language plpgsql;
"
```

**Validação**:
```sql
SELECT proname FROM pg_proc WHERE proname = 'propagate_ids_to_task';
```

**Resultado esperado**: 1 row

---

### Task 6.4: Criar Função propagate_org_id_from_task()

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 013 (quarta parte)

**Comando MCP**:
```
mcp supabase apply_migration --name "022_function_propagate_from_task" --query "
create or replace function propagate_org_id_from_task()
returns trigger as \$\$
begin
  if new.org_id is null then
    new.org_id := (select org_id from tasks where id = new.task_id);
  end if;
  return new;
end;
\$\$ language plpgsql;
"
```

**Validação**:
```sql
SELECT proname FROM pg_proc WHERE proname LIKE 'propagate_%';
```

**Resultado esperado**: 4 rows

---

### Task 6.5: Criar Triggers de Propagação

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 013 (quinta parte)

**⚠️ CRÍTICO**: O nome `trg_tasks_propagate_ids` DEVE vir ANTES de `trg_tasks_set_local_id` alfabeticamente!

**Comando MCP**:
```
mcp supabase apply_migration --name "023_triggers_propagate" --query "
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

create trigger trg_comments_propagate_org
  before insert on comments
  for each row execute function propagate_org_id_from_task();
"
```

**Validação**:
```sql
SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%_propagate%' ORDER BY tgname;
```

**Resultado esperado**: 6 triggers

**✅ CHECKPOINT**: Se validação passou, prossiga para Fase 7.

---

## Fase 7: Trigger - Local ID Generator

> **Objetivo**: Criar o trigger que gera IDs amigáveis (APP-1, APP-2...) automaticamente.
> **Dependências**: Fase 6 completa (propagate_ids já criado)
> **⚠️ CRÍTICO**: Este trigger DEVE executar APÓS propagate_ids!

### Task 7.1: Criar Função set_task_local_id()

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 015

**⚠️ ATENÇÃO**: Inclui `FOR UPDATE` lock para evitar race condition!

**Comando MCP**:
```
mcp supabase apply_migration --name "024_function_set_local_id" --query "
create or replace function set_task_local_id()
returns trigger as \$\$
declare
  max_id integer;
begin
  perform id from projects where id = new.project_id for update;
  
  select coalesce(max(local_id), 0) into max_id
  from tasks
  where project_id = new.project_id;
  
  new.local_id := max_id + 1;
  return new;
end;
\$\$ language plpgsql;

comment on function set_task_local_id() is 
  'Gera ID sequencial por projeto para IDs amigáveis (APP-1, APP-2...)';
"
```

**Validação**:
```sql
SELECT proname FROM pg_proc WHERE proname = 'set_task_local_id';
```

**Resultado esperado**: 1 row

---

### Task 7.2: Criar Trigger trg_tasks_set_local_id

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 015 (segunda parte)

**⚠️ CRÍTICO**: Nome começa com "s" que vem DEPOIS de "p" (propagate) alfabeticamente!

**Comando MCP**:
```
mcp supabase apply_migration --name "025_trigger_set_local_id" --query "
create trigger trg_tasks_set_local_id
  before insert on tasks
  for each row
  execute function set_task_local_id();
"
```

**Validação da ordem dos triggers**:
```sql
SELECT tgname FROM pg_trigger 
WHERE tgrelid = 'tasks'::regclass 
AND tgname LIKE 'trg_tasks_%'
ORDER BY tgname;
```

**Resultado esperado** (ORDEM CRÍTICA):
1. `trg_tasks_propagate_ids` (p < s, executa primeiro)
2. `trg_tasks_set_local_id` (s > p, executa segundo)
3. `trg_tasks_updated_at`

---

### Task 7.3: Validar Fase 7 Completa

**Query de validação completa**:
```sql
SELECT tgname, proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'tasks'::regclass
ORDER BY tgname;
```

**Resultado esperado**: 3 triggers na tasks (propagate, set_local_id, updated_at)

**✅ CHECKPOINT**: Se validação passou, prossiga para Fase 8.

---

### Task 7.4: (RESERVADO)

*Esta task está reservada para futuras adições à Fase 7.*

---

### Task 7.5: (RESERVADO)

*Esta task está reservada para futuras adições à Fase 7.*

---

## Fase 8: RLS - Habilitar + Helper

> **Objetivo**: Habilitar RLS em todas as tabelas e criar a função helper.
> **Dependências**: Todas as tabelas criadas
> **Validação**: RLS habilitado em 10 tabelas

### Task 8.1: Habilitar RLS em Todas as Tabelas

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 014 (primeira parte)

**Comando MCP**:
```
mcp supabase apply_migration --name "026_enable_rls" --query "
alter table organizations enable row level security;
alter table user_profiles enable row level security;
alter table projects enable row level security;
alter table project_docs enable row level security;
alter table epics enable row level security;
alter table features enable row level security;
alter table tasks enable row level security;
alter table poker_sessions enable row level security;
alter table poker_votes enable row level security;
alter table comments enable row level security;
"
```

**Validação**:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
```

**Resultado esperado**: 10 tabelas com RLS habilitado

---

### Task 8.2: Criar Função Helper auth.user_org_id()

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 014 (segunda parte)

**⚠️ ATENÇÃO**: Função no schema `auth`, não `public`!

**Comando MCP**:
```
mcp supabase apply_migration --name "027_function_user_org_id" --query "
create or replace function auth.user_org_id()
returns uuid as \$\$
  select org_id from user_profiles where id = auth.uid()
\$\$ language sql security definer stable;
"
```

**Validação**:
```sql
SELECT proname, pronamespace::regnamespace as schema FROM pg_proc WHERE proname = 'user_org_id';
```

**Resultado esperado**: 1 row com schema = 'auth'

---

### Task 8.3: Validar Fase 8 Completa

**Query de validação completa**:
```sql
SELECT 
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as rls_enabled_tables,
  (SELECT count(*) FROM pg_proc WHERE proname = 'user_org_id') as helper_function;
```

**Resultado esperado**: rls_enabled_tables = 10, helper_function = 1

**✅ CHECKPOINT**: Se validação passou, prossiga para Fase 9.

---

### Task 8.4: (RESERVADO)

*Esta task está reservada para futuras adições à Fase 8.*

---

### Task 8.5: (RESERVADO)

*Esta task está reservada para futuras adições à Fase 8.*

---

## Fase 9: RLS Policies - Core Tables

> **Objetivo**: Criar policies para organizations, user_profiles, projects, project_docs.
> **Dependências**: Fase 8 completa (RLS habilitado)
> **Validação**: 10 policies criadas

### Task 9.1: Criar Policies para organizations

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 014 (POLICIES: Organizations)

**Comando MCP**:
```
mcp supabase apply_migration --name "028_policies_organizations" --query "
create policy \"Users can view own organization\"
  on organizations for select
  using (id = auth.user_org_id());
"
```

**Validação**:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'organizations';
```

**Resultado esperado**: 1 policy

---

### Task 9.2: Criar Policies para user_profiles

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 014 (POLICIES: User Profiles)

**Comando MCP**:
```
mcp supabase apply_migration --name "029_policies_user_profiles" --query "
create policy \"Users can view profiles in same org\"
  on user_profiles for select
  using (org_id = auth.user_org_id());

create policy \"Users can update own profile\"
  on user_profiles for update
  using (id = auth.uid());
"
```

**Validação**:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles';
```

**Resultado esperado**: 2 policies

---

### Task 9.3: Criar Policies para projects

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 014 (POLICIES: Projects)

**Comando MCP**:
```
mcp supabase apply_migration --name "030_policies_projects" --query "
create policy \"Users can view projects in own org\"
  on projects for select
  using (org_id = auth.user_org_id());

create policy \"Users can insert projects in own org\"
  on projects for insert
  with check (org_id = auth.user_org_id());

create policy \"Users can update projects in own org\"
  on projects for update
  using (org_id = auth.user_org_id());

create policy \"Users can delete projects in own org\"
  on projects for delete
  using (org_id = auth.user_org_id());
"
```

**Validação**:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'projects';
```

**Resultado esperado**: 4 policies

---

### Task 9.4: Criar Policies para project_docs

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 014 (POLICIES: Project Docs)

**Comando MCP**:
```
mcp supabase apply_migration --name "031_policies_project_docs" --query "
create policy \"Users can view project_docs in own org\"
  on project_docs for select
  using (org_id = auth.user_org_id());

create policy \"Users can insert project_docs in own org\"
  on project_docs for insert
  with check (org_id = auth.user_org_id());

create policy \"Users can update project_docs in own org\"
  on project_docs for update
  using (org_id = auth.user_org_id());

create policy \"Users can delete project_docs in own org\"
  on project_docs for delete
  using (org_id = auth.user_org_id());
"
```

**Validação**:
```sql
SELECT count(*) FROM pg_policies WHERE tablename IN ('organizations', 'user_profiles', 'projects', 'project_docs');
```

**Resultado esperado**: 11 policies

---

### Task 9.5: Validar Fase 9 Completa

**Query de validação completa**:
```sql
SELECT tablename, count(*) as policy_count 
FROM pg_policies 
WHERE tablename IN ('organizations', 'user_profiles', 'projects', 'project_docs')
GROUP BY tablename
ORDER BY tablename;
```

**Resultado esperado**:
- organizations: 1
- project_docs: 4
- projects: 4
- user_profiles: 2

**✅ CHECKPOINT**: Se validação passou, prossiga para Fase 10.

---

## Fase 10: RLS Policies - Hierarchy Tables

> **Objetivo**: Criar policies para epics, features, tasks.
> **Dependências**: Fase 9 completa
> **Validação**: 12 policies criadas

### Task 10.1: Criar Policies para epics

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 014 (POLICIES: Epics)

**Comando MCP**:
```
mcp supabase apply_migration --name "032_policies_epics" --query "
create policy \"Users can view epics in own org\"
  on epics for select
  using (org_id = auth.user_org_id());

create policy \"Users can insert epics in own org\"
  on epics for insert
  with check (org_id = auth.user_org_id());

create policy \"Users can update epics in own org\"
  on epics for update
  using (org_id = auth.user_org_id());

create policy \"Users can delete epics in own org\"
  on epics for delete
  using (org_id = auth.user_org_id());
"
```

**Validação**:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'epics';
```

**Resultado esperado**: 4 policies

---

### Task 10.2: Criar Policies para features

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 014 (POLICIES: Features)

**Comando MCP**:
```
mcp supabase apply_migration --name "033_policies_features" --query "
create policy \"Users can view features in own org\"
  on features for select
  using (org_id = auth.user_org_id());

create policy \"Users can insert features in own org\"
  on features for insert
  with check (org_id = auth.user_org_id());

create policy \"Users can update features in own org\"
  on features for update
  using (org_id = auth.user_org_id());

create policy \"Users can delete features in own org\"
  on features for delete
  using (org_id = auth.user_org_id());
"
```

**Validação**:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'features';
```

**Resultado esperado**: 4 policies

---

### Task 10.3: Criar Policies para tasks

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 014 (POLICIES: Tasks)

**Comando MCP**:
```
mcp supabase apply_migration --name "034_policies_tasks" --query "
create policy \"Users can view tasks in own org\"
  on tasks for select
  using (org_id = auth.user_org_id());

create policy \"Users can insert tasks in own org\"
  on tasks for insert
  with check (org_id = auth.user_org_id());

create policy \"Users can update tasks in own org\"
  on tasks for update
  using (org_id = auth.user_org_id());

create policy \"Users can delete tasks in own org\"
  on tasks for delete
  using (org_id = auth.user_org_id());
"
```

**Validação**:
```sql
SELECT count(*) FROM pg_policies WHERE tablename IN ('epics', 'features', 'tasks');
```

**Resultado esperado**: 12 policies

---

### Task 10.4: Criar Policies para comments

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 016 (POLICIES: Comments)

**⚠️ ATENÇÃO**: Insert e Update/Delete têm regras diferentes!

**Comando MCP**:
```
mcp supabase apply_migration --name "035_policies_comments" --query "
create policy \"Users can view comments in own org\"
  on comments for select
  using (org_id = auth.user_org_id());

create policy \"Users can insert comments in own org\"
  on comments for insert
  with check (org_id = auth.user_org_id() and user_id = auth.uid());

create policy \"Users can update own comments\"
  on comments for update
  using (user_id = auth.uid());

create policy \"Users can delete own comments\"
  on comments for delete
  using (user_id = auth.uid());
"
```

**Validação**:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'comments';
```

**Resultado esperado**: 4 policies

---

### Task 10.5: Validar Fase 10 Completa

**Query de validação completa**:
```sql
SELECT tablename, count(*) as policy_count 
FROM pg_policies 
WHERE tablename IN ('epics', 'features', 'tasks', 'comments')
GROUP BY tablename
ORDER BY tablename;
```

**Resultado esperado**: 4 tabelas com 4 policies cada = 16 policies

**✅ CHECKPOINT**: Se validação passou, prossiga para Fase 11.

---

## Fase 11: RLS Policies - Poker Tables

> **Objetivo**: Criar policies para poker_sessions e poker_votes.
> **Dependências**: Fase 10 completa
> **Validação**: 8 policies criadas

### Task 11.1: Criar Policies para poker_sessions

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 014 (POLICIES: Poker Sessions)

**Comando MCP**:
```
mcp supabase apply_migration --name "036_policies_poker_sessions" --query "
create policy \"Users can view poker_sessions in own org\"
  on poker_sessions for select
  using (org_id = auth.user_org_id());

create policy \"Users can insert poker_sessions in own org\"
  on poker_sessions for insert
  with check (org_id = auth.user_org_id());

create policy \"Users can update poker_sessions in own org\"
  on poker_sessions for update
  using (org_id = auth.user_org_id());

create policy \"Users can delete poker_sessions in own org\"
  on poker_sessions for delete
  using (org_id = auth.user_org_id());
"
```

**Validação**:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'poker_sessions';
```

**Resultado esperado**: 4 policies

---

### Task 11.2: Criar Policies para poker_votes

**Arquivo fonte**: `docs/database/schema-v2.md` → Migration 014 (POLICIES: Poker Votes)

**⚠️ ATENÇÃO**: poker_votes não tem org_id - usa JOIN com poker_sessions!

**Comando MCP**:
```
mcp supabase apply_migration --name "037_policies_poker_votes" --query "
create policy \"Users can view votes in accessible sessions\"
  on poker_votes for select
  using (
    exists (
      select 1 from poker_sessions ps
      where ps.id = poker_votes.session_id
      and ps.org_id = auth.user_org_id()
    )
  );

create policy \"Users can insert own votes\"
  on poker_votes for insert
  with check (user_id = auth.uid());

create policy \"Users can update own votes\"
  on poker_votes for update
  using (user_id = auth.uid());

create policy \"Users can delete own votes\"
  on poker_votes for delete
  using (user_id = auth.uid());
"
```

**Validação**:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'poker_votes';
```

**Resultado esperado**: 4 policies

---

### Task 11.3: Validar Fase 11 Completa

**Query de validação completa**:
```sql
SELECT tablename, count(*) as policy_count 
FROM pg_policies 
WHERE tablename IN ('poker_sessions', 'poker_votes')
GROUP BY tablename
ORDER BY tablename;
```

**Resultado esperado**: 2 tabelas com 4 policies cada = 8 policies

---

### Task 11.4: Validação FINAL - Contagem Total de Policies

**Query de validação FINAL**:
```sql
SELECT count(*) as total_policies FROM pg_policies WHERE schemaname = 'public';
```

**Resultado esperado**: 35 policies no total

---

### Task 11.5: Validação FINAL - Schema Completo

**Query de validação do schema completo**:
```sql
SELECT 
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as tables,
  (SELECT count(*) FROM pg_type WHERE typname LIKE '%_status' OR typname IN ('user_role', 'task_type', 'task_priority')) as enums,
  (SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg_%') as triggers,
  (SELECT count(*) FROM pg_proc WHERE proname LIKE 'propagate_%' OR proname IN ('update_updated_at', 'set_task_local_id', 'user_org_id')) as functions,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') as policies;
```

**Resultado esperado**:
- tables: 10
- enums: 7
- triggers: ~18
- functions: 6
- policies: 35

---

## 🎉 Implementação Completa!

Se todas as validações passaram, o banco de dados está pronto para uso.

### Próximos Passos

1. **Criar organização de teste** via Supabase Dashboard
2. **Criar usuário de teste** e vincular à organização
3. **Testar CRUD completo** via API ou SQL Editor
4. **Validar isolamento RLS** com 2 organizações diferentes

### Comandos Úteis Pós-Implementação

```sql
-- Ver todas as tabelas
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Ver todos os índices
SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;

-- Ver todas as policies
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- Ver todos os triggers
SELECT tgname, tgrelid::regclass as table_name FROM pg_trigger WHERE tgname LIKE 'trg_%' ORDER BY tgname;
```

---

## 📝 Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | 2025-12-18 | Spec inicial com 11 fases |

