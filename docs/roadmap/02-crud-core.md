---
epic: "02. CRUD Core"
status: TODO
priority: P0
sprint: 1
tags: [crud, core, database]
---

# 🏗️ Épico 02: CRUD Core

## Objetivo

Implementar as operações fundamentais de criação, leitura, atualização e deleção para as entidades principais do sistema, estabelecendo a hierarquia rígida de dados.

## Problema de Negócio

Sem o CRUD Core:
- ❌ Não é possível criar projetos ou tarefas
- ❌ Sem estrutura para organizar o trabalho
- ❌ Sistema inutilizável mesmo com login
- ❌ Sem base para features avançadas (IA, Poker)

## Solução

Implementar Use Cases e API Routes para a hierarquia completa: Organization → Project → Epic → Feature → Task.

---

## Features

### ✅ Feature 2.1: Project CRUD & Modules
**Status:** 🔴 TODO  
**Prioridade:** P0  
**Estimativa:** 5 pontos

**Descrição:**
Gerenciamento de projetos e seus módulos técnicos. Módulos são arrays de strings, não tabelas separadas.

**Critérios de Aceite:**
- [ ] Criar projeto com nome e descrição
- [ ] Definir/Editar módulos (ex: ['Backend', 'Frontend', 'Mobile'])
- [ ] Listar projetos da organização
- [ ] Soft delete de projeto

**Tarefas Técnicas:**
- [ ] Use cases: `createProject`, `getProjects`, `updateProject`, `deleteProject`
- [ ] API Routes: `/api/projects` e `/api/projects/[id]`
- [ ] Validar que módulos são array de strings único
- [ ] Garantir isolamento por `org_id`

**Arquivos Envolvidos:**
- `src/domain/use-cases/projects/`
- `src/app/api/projects/`
- `src/shared/validators/project-schema.ts`

---

### ✅ Feature 2.2: Epic CRUD
**Status:** 🔴 TODO  
**Prioridade:** P0  
**Estimativa:** 3 pontos

**Descrição:**
Gerenciamento de Épicos (objetivos macro) dentro de um projeto.

**Critérios de Aceite:**
- [ ] Criar épico vinculado a um projeto
- [ ] Listar épicos de um projeto
- [ ] Status do épico (OPEN, CLOSED)
- [ ] Progresso calculado (baseado em features/tasks)

**Tarefas Técnicas:**
- [ ] Use cases: `createEpic`, `getEpics`, `updateEpic`
- [ ] API Routes: `/api/projects/[id]/epics`
- [ ] Campo calculado de progresso (opcional no MVP)

**Arquivos Envolvidos:**
- `src/domain/use-cases/epics/`
- `src/app/api/epics/`

---

### ✅ Feature 2.3: Feature CRUD
**Status:** 🔴 TODO  
**Prioridade:** P0  
**Estimativa:** 5 pontos

**Descrição:**
Gerenciamento de Features (entregáveis) dentro de um épico.

**Critérios de Aceite:**
- [ ] Criar feature vinculada a um épico
- [ ] Status da feature (BACKLOG, DOING, DONE, etc)
- [ ] Bloqueio automático se houver bugs abertos (preparação)

**Tarefas Técnicas:**
- [ ] Use cases: `createFeature`, `getFeatures`, `updateFeature`
- [ ] API Routes: `/api/epics/[id]/features`

**Arquivos Envolvidos:**
- `src/domain/use-cases/features/`
- `src/app/api/features/`

---

### ✅ Feature 2.4: Task CRUD
**Status:** 🔴 TODO  
**Prioridade:** P0  
**Estimativa:** 8 pontos

**Descrição:**
Gerenciamento de Tasks (unidade de trabalho) dentro de uma feature.

**Critérios de Aceite:**
- [ ] Criar task vinculada a uma feature
- [ ] Tipos: TASK ou BUG
- [ ] Campos: Title, Description, Priority, Points, Assignee, Module
- [ ] Status inicial: BACKLOG
- [ ] Atribuição de usuário (Assignee)

**Tarefas Técnicas:**
- [ ] Use cases: `createTask`, `getTasks`, `updateTask`
- [ ] API Routes: `/api/features/[id]/tasks`
- [ ] Validação de transição de status (preparação para workflow)

**Arquivos Envolvidos:**
- `src/domain/use-cases/tasks/`
- `src/app/api/tasks/`

---

### ✅ Feature 2.5: Project Docs CRUD
**Status:** 🔴 TODO  
**Prioridade:** P1  
**Estimativa:** 3 pontos

**Descrição:**
Gerenciamento de documentação do projeto (Markdown) que servirá de contexto para a IA.

**Critérios de Aceite:**
- [ ] Criar/Editar doc em Markdown
- [ ] Salvar como TEXT no banco (não Storage)
- [ ] Listar docs do projeto

**Tarefas Técnicas:**
- [ ] Use cases: `createDoc`, `getDocs`, `updateDoc`
- [ ] API Routes: `/api/projects/[id]/docs`
- [ ] Tabela `project_docs` já existe no schema

**Arquivos Envolvidos:**
- `src/domain/use-cases/docs/`
- `src/app/api/docs/`

---

### ✅ Feature 2.6: Hierarchical View (Get Full Tree)
**Status:** 🔴 TODO  
**Prioridade:** P1  
**Estimativa:** 5 pontos

**Descrição:**
Endpoint otimizado para buscar a árvore completa ou parcial de um projeto para renderização inicial.

**Critérios de Aceite:**
- [ ] Retornar Projeto -> Épicos -> Features -> Tasks
- [ ] Performance otimizada (evitar N+1 queries)
- [ ] Suporte a filtros básicos

**Tarefas Técnicas:**
- [ ] Use case: `getProjectTree`
- [ ] Query otimizada com Prisma (`include` aninhado)

**Arquivos Envolvidos:**
- `src/domain/use-cases/projects/get-project-tree.ts`

---

## Dependências

**Bloqueia:**
- Épico 03 (Kanban) - precisa de dados para exibir
- Épico 04 (AI Scribe) - precisa criar tasks
- Épico 05 (Poker) - precisa de tasks para votar

**Depende de:**
- Épico 01 (Auth) - precisa de `org_id` e `user_id`

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Performance da Tree View | Média | Médio | Paginação ou carregar sob demanda se crescer muito |
| Concorrência em Edição | Baixa | Baixo | Last write wins (MVP) |

---

## Métricas de Sucesso

- [ ] CRUD completo funcional para todas as 5 entidades
- [ ] Tempo de resposta da Tree View < 500ms para projetos médios
- [ ] Integridade referencial mantida (não criar task sem feature)
