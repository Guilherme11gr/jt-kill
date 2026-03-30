Assumindo a persona do **Product Owner** focado em entregar um produto robusto, enxuto e de alto valor (o "FluXo"), apresento a **Bíblia do Projeto (System Reference Document)**.

Estes três documentos mestres consolidam todas as decisões de escopo, arquitetura, *workflow* e regras de negócio que validamos. Eles devem ser a **Fonte da Verdade** (Source of Truth) para seus Agentes de Desenvolvimento, garantindo que o produto seja entregue exatamente como planejado em até 2 semanas.

---

### 📂 Arquivo 1: Visão do Produto e Regras de Negócio

**Nome do Arquivo:** `01_PRODUCT_REQUIREMENTS.md`

Este documento define o comportamento do sistema e o modelo de domínio (DDD).

```markdown
# 📘 01. Product Requirements Document (PRD)

## 1. Visão e Filosofia

*   **Produto:** "FluXo" (Internal MVP).
*   **Conceito:** Gerenciador de projetos focado em engenharia, **"Opinionated"** (fluxo rígido) e **"Low Friction"** (rápido de usar).
*   **Diferencial (Killer Feature):** **"AI Scribe"** – Transforma anotações desestruturadas ("Brain Dumps") em tarefas técnicas estruturadas, usando o contexto do projeto.
*   **Anti-Patterns (O que NÃO somos):** Não somos o Notion (sem campos infinitos), não somos o Jira (sem configuração complexa).

---

## 2. Estrutura de Domínio (DDD)

### Entidades Principais (Hierarquia Rígida)

1.  **Organization:** O Tenant (Empresa).
2.  **Project (Produto):** A unidade de entrega de valor (ex: "App Mobile"). Regra: Um projeto define o escopo técnico e as regras de negócio.
3.  **Module (Contexto Técnico):** Sub-divisão técnica de um projeto (ex: `SDK`, `API`, `Front`). Regra: Lista controlada pelo Owner do Projeto, servindo para agrupar tarefas no Dashboard do Desenvolvedor e substituir tags livres.
4.  **Epic:** Objetivo macro de negócio.
5.  **Feature:** Entregável funcional, agrupador pai das tasks.
6.  **Task:** Unidade de trabalho indivisível. Tipos: `TASK` (Desenvolvimento) ou `BUG` (Defeito).
7.  **Project Context:** Documentos (Markdown) salvos no banco que servem como base de conhecimento para a IA (Cérebro da IA).

---

## 3. Workflows e Processos (Core)

### 3.1. Máquina de Estados (Workflow Rígido)

O sistema impõe um fluxo fixo para as tarefas:
1.  **BACKLOG:** Ideias ou Bugs reportados.
2.  **TODO:** Selecionado para o ciclo atual (Fila do Dev).
3.  **DOING:** Em desenvolvimento.
4.  **REVIEW:** PR aberto / Code Review.
5.  **QA_READY:** Disponível em ambiente de testes.
6.  **DONE:** Validado e em Produção.

### 3.2. Fluxo de QA (Quality Assurance)

O fluxo é desenhado para resolver o problema de rastreabilidade de bugs e posse da tarefa.

*   **Cenário A: "Ping-Pong" (Ajustes Menores)**:
    *   O QA move o card de `QA_READY` de volta para `DOING`.
    *   O `Assignee` **NÃO** muda, mantendo o Dev como dono, e o sistema o notifica.

*   **Cenário B: "Bug Real" (Feature-Centric Testing)**:
    *   O QA clica em **"Report Bug"** dentro da **Feature**.
    *   O sistema cria uma nova Task (`Type=BUG`) vinculada à Feature e a envia para o **BACKLOG** com destaque visual crítico (Borda Vermelha).
    *   A Feature pai fica **bloqueada** (não pode ser movida para "Done") enquanto houver Bugs filhos abertos.

### 3.3. Dashboard Pessoal ("My Focus")

A tela inicial do desenvolvedor é projetada para agrupamento e priorização de contexto técnico.

*   **Agrupamento:** As tarefas **SÃO** agrupadas por **Módulo** (ex: Bloco "Tasks do SDK", Bloco "Tasks da API").
*   **Ordenação (Prioridade Visual):** Dentro de cada módulo, a ordem é: Bugs Críticos > Tasks em `DOING` ou `REVIEW` > Tasks em `TODO`.

---

## 4. Funcionalidades de Inteligência (AI)

### 4.1. "The AI Scribe" (Compilador de Tasks)

O foco é padronizar a qualidade da documentação.
*   **Fluxo de Uso:** O Gestor digita anotações rápidas ("Brain Dump"). O sistema lê os `Project Docs` + o `Brain Dump` e retorna uma estrutura JSON sugerindo Título, Descrição Técnica e Child Tasks.
*   **Staging Area (Revisão):** O usuário revisa a sugestão da IA em um formulário editável antes de salvar no banco de dados (previne alucinações e garante controle).

---

## 5. Scrum Poker (In-Place)

*   **Conceito:** Estimativa sem sair do contexto da task (Zero fricção).
*   **Local:** Dentro do Modal de Detalhes da Task.
*   **Realtime:** Usa Supabase Realtime para que os usuários vejam quem votou (carta virada) instantaneamente, e o moderador clica em "Revelar" para calcular a média e popular o campo `Points`.

```

---

### 📂 Arquivo 2: Especificação Técnica e Arquitetura

**Nome do Arquivo:** `02_TECHNICAL_SPEC.md`

Este documento é a base para o desenvolvimento do *backend* e *frontend*.

```markdown
# 📕 02. Technical Specifications

## 1. Stack Tecnológica

*   **Frontend:** Next.js 14 (App Router), TypeScript, **Tailwind CSS + Shadcn/UI**.
*   **Backend/Database:** **Supabase** (PostgreSQL).
*   **Realtime:** Supabase Realtime.
*   **AI:** OpenAI API (GPT-4o-mini) ou Anthropic (Claude 3.5 Sonnet).

## 2. Decisões de Arquitetura (Constraints Rígidas)

*   **Armazenamento de Docs:** Arquivos de contexto (`.md`) são salvos como `TEXT` puro no banco de dados (coluna `content` na tabela `project_docs`). **NÃO** será usado Supabase Storage/Buckets (decisão de eficiência e simplicidade).
*   **Campos Customizados:** O sistema **não** suporta campos dinâmicos estilo Notion. Serão usadas colunas SQL fixas e o campo `tags text[]`.
*   **Módulos:** Tags de repositório/contexto técnico são implementadas como um Array de Strings (`modules text[]`) na tabela `projects`, não como uma tabela relacional.

## 3. Database Schema (PostgreSQL)

O Schema abaixo reflete a hierarquia rígida e o suporte a Módulos e Poker.

```sql
-- Configuração Inicial
create extension if not exists "uuid-ossp";

-- 1. Organizations
create table organizations (
id uuid default uuid_generate_v4() primary key,
name text not null,
created_at timestamptz default now()
);

-- 2. Projects (Produtos)
create table projects (
id uuid default uuid_generate_v4() primary key,
org_id uuid references organizations(id) not null,
name text not null,
key text not null, -- Ex: "APP" (Prefixo para IDs)
modules text[] default '{}', -- Ex: ['SDK', 'API', 'WEB'] (Controlado pelo Owner)
created_at timestamptz default now()
);

-- 3. Project Docs (Memória da IA)
create table project_docs (
id uuid default uuid_generate_v4() primary key,
project_id uuid references projects(id) on delete cascade not null,
title text not null, -- Ex: "Styleguide.md"
content text not null, -- Markdown puro armazenado direto no banco
created_at timestamptz default now()
);

-- 4. Epics
create table epics (
id uuid default uuid_generate_v4() primary key,
project_id uuid references projects(id) on delete cascade not null,
title text not null,
description text,
status text default 'TODO',
created_at timestamptz default now()
);

-- 5. Features
create table features (
id uuid default uuid_generate_v4() primary key,
epic_id uuid references epics(id) on delete cascade not null,
title text not null,
description text,
status text default 'TODO',
created_at timestamptz default now()
);

-- 6. Tasks & Bugs
create table tasks (
id uuid default uuid_generate_v4() primary key,
feature_id uuid references features(id) on delete cascade not null,
title text not null,
description text, -- Markdown suportado
status text default 'BACKLOG' check (status in ('BACKLOG', 'TODO', 'DOING', 'REVIEW', 'QA_READY', 'DONE')),
type text default 'TASK' check (type in ('TASK', 'BUG')), -- Distinção Bug/Task
points integer, -- Resultado do Poker
priority text default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
module text, -- Deve validar se existe no array projects.modules
assignee_id uuid references auth.users(id),
created_at timestamptz default now()
);

-- 7. Poker Votes (Realtime)
create table poker_votes (
id uuid default uuid_generate_v4() primary key,
task_id uuid references tasks(id) on delete cascade not null,
user_id uuid references auth.users(id) not null,
vote integer not null,
created_at timestamptz default now(),
unique(task_id, user_id)
);

-- Índices para Performance do Dashboard
create index idx_tasks_assignee_status on tasks(assignee_id, status);
create index idx_tasks_module on tasks(module);
create index idx_tasks_feature on tasks(feature_id);
create index idx_poker_task on poker_votes(task_id);
```

## 4. Lógica de Implementação da IA (Backend)

O fluxo da IA é crucial e deve ser implementado via *Server Action* ou *API Route*.

*   **Endpoint:** `/api/ai/generate-tasks`
*   **Logic:**
    1.  O *backend* recebe o `projectId` e o `brainDump`.
    2.  Busca o conteúdo de todos os `project_docs` do projeto (`SELECT content FROM project_docs...`).
    3.  Concatena esse conteúdo em uma string (`CONTEXT_STRING`) e a injeta no `System Prompt` da LLM.
    4.  A LLM atua como um *Technical Product Manager* e retorna um JSON estruturado com Features e Tasks para o *frontend* revisar (Staging Area).

```

---

### 📂 Arquivo 3: UX Guidelines e Interação

**Nome do Arquivo:** `03_UX_DESIGN_SYSTEM.md`

Este documento detalha as decisões de *design* e interação para o *frontend*, garantindo uma experiência *Low Friction*.

```markdown
# 🎨 03. UX & Interaction Guidelines

## 1. Princípios Visuais

*   **Tema:** Dark Mode Nativo (`slate-950` background, `slate-900` cards).
*   **Acentos:** Cores semânticas. **Bug** é `Red-500` (Borda ou Ícone). O **Module Badge** deve usar cores consistentes baseadas em Hash da String (ex: SDK = Roxo, API = Azul) para facilitar a identificação visual rápida.

## 2. Componentes Chave

### 2.1. O Card do Kanban (Task Card)

A anatomia deve ser rígida para máxima informação em pouco espaço:
1.  **Header:** `Badge Módulo` + `ID da Task (Clickable)` + `Prioridade Icon`.
2.  **Body:** Título da Task (Truncado em 3 linhas).
3.  **Footer:** Avatar do Assignee, Badge de Story Points e Indicador de **"Bug"** se `type == 'BUG'`.

### 2.2. O Dashboard Pessoal ("My Focus")

*   **Seção "Meus Bugs e Bloqueios":** Cards renderizados com borda `border-red-500/50` para chamar atenção imediata (prioridade máxima).
*   **Seção "Por Módulo":** Cards agrupados por Título do Módulo (ex: Bloco "📦 SDK Core").

### 2.3. O Modal de Task (Detail View)

*   **Estrutura:** Dividida (70% para conteúdo, 30% Sidebar para metadados).
*   **Sidebar:** Contém Selects para Status, Assignee, e **Module**.
*   **Área de Poker:** Lista de Avatares (Votou/Não Votou) e o Botão "Revelar".

### 2.4. O Botão "Report Bug"

*   **Localização:** Header da Feature ou Linha da Tabela da Feature.
*   **Interação:** Abre um Modal, onde o campo `Feature` e `Type='BUG'` vêm **pré-preenchidos e travados** (automação do fluxo de QA).
```