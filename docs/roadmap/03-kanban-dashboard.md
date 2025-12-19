---
epic: "03. Kanban & Dashboard"
status: TODO
priority: P1
sprint: 2
tags: [ui, kanban, dashboard]
---

# 📊 Épico 03: Kanban & Dashboard

## Objetivo

Criar as interfaces principais de trabalho: Dashboard pessoal ("My Focus") e Kanban Board do projeto, permitindo visualização e movimentação fluida de tarefas.

## Problema de Negócio

Sem visualização adequada:
- ❌ Desenvolvedores não sabem o que fazer
- ❌ Gestores não veem gargalos
- ❌ Difícil priorizar trabalho
- ❌ Bugs críticos ficam perdidos

## Solução

Dashboard focado no desenvolvedor (My Focus) e Board clássico para visão do time, com filtros poderosos e UX fluida.

---

## Features

### ✅ Feature 3.1: Dashboard "My Focus"
**Status:** 🔴 TODO  
**Prioridade:** P1  
**Estimativa:** 8 pontos

**Descrição:**
Visão pessoal do desenvolvedor, agrupada por módulo e priorizada automaticamente.

**Critérios de Aceite:**
- [ ] Listar tasks atribuídas ao usuário logado
- [ ] Agrupar por Módulo (ex: Backend, Frontend)
- [ ] Ordenar por: Bugs > DOING > REVIEW > TODO
- [ ] Destaque visual para Bugs (borda vermelha)

**Tarefas Técnicas:**
- [ ] Criar página `/app/dashboard`
- [ ] Componente `MyFocusBoard`
- [ ] Query otimizada `getMyTasks`
- [ ] UI de Cards simplificados

**Arquivos Envolvidos:**
- `src/app/(app)/dashboard/page.tsx`
- `src/components/dashboard/my-focus.tsx`

---

### ✅ Feature 3.2: Kanban Board
**Status:** 🔴 TODO  
**Prioridade:** P1  
**Estimativa:** 8 pontos

**Descrição:**
Visualização clássica de colunas por status para o projeto inteiro.

**Critérios de Aceite:**
- [ ] Colunas: BACKLOG, TODO, DOING, REVIEW, QA_READY, DONE
- [ ] Exibir todas as tasks do projeto (ou filtradas)
- [ ] Drag & Drop para mover entre colunas
- [ ] Validar transições permitidas ao soltar

**Tarefas Técnicas:**
- [ ] Criar página `/app/projects/[id]/board`
- [ ] Implementar Drag & Drop (dnd-kit ou similar)
- [ ] Integrar com validação de transição de status
- [ ] Optimistic UI updates

**Arquivos Envolvidos:**
- `src/app/(app)/projects/[id]/board/page.tsx`
- `src/components/board/kanban-board.tsx`
- `src/components/board/column.tsx`

---

### ✅ Feature 3.3: Task Modal (Detail View)
**Status:** 🔴 TODO  
**Prioridade:** P1  
**Estimativa:** 5 pontos

**Descrição:**
Modal para ver e editar detalhes da task, sem sair do board.

**Critérios de Aceite:**
- [ ] Abrir ao clicar no card
- [ ] Editar título, descrição, status, assignee, points, module
- [ ] Renderizar Markdown na descrição
- [ ] URL compartilhável (query param `?task=123`)

**Tarefas Técnicas:**
- [ ] Componente `TaskDetailModal`
- [ ] Roteamento interceptado (opcional) ou state local
- [ ] Editor de Markdown simples

**Arquivos Envolvidos:**
- `src/components/tasks/task-modal.tsx`

---

### ✅ Feature 3.4: Filtros e Busca
**Status:** 🔴 TODO  
**Prioridade:** P2  
**Estimativa:** 3 pontos

**Descrição:**
Capacidade de filtrar o board por assignee, módulo, prioridade e busca textual.

**Critérios de Aceite:**
- [ ] Filtro por Assignee (dropdown com avatares)
- [ ] Filtro por Módulo
- [ ] Busca por texto (título/descrição)
- [ ] Filtros persistem na URL

**Tarefas Técnicas:**
- [ ] Componente `BoardFilters`
- [ ] Hook `useTaskFilters`
- [ ] Atualizar query do board com filtros

**Arquivos Envolvidos:**
- `src/components/board/filters.tsx`

---

### ✅ Feature 3.5: Drag & Drop com Validação
**Status:** 🔴 TODO  
**Prioridade:** P1  
**Estimativa:** 5 pontos

**Descrição:**
Implementar lógica de transição de estados no Drag & Drop, impedindo movimentos inválidos.

**Critérios de Aceite:**
- [ ] Permitir apenas transições válidas (ex: TODO -> DOING)
- [ ] Rejeitar visualmente movimentos inválidos (ex: BACKLOG -> DONE)
- [ ] Feedback de erro se API falhar

**Tarefas Técnicas:**
- [ ] Integrar `canTransition` (do workflow) no `onDragEnd`
- [ ] Reverter movimento se falhar

**Arquivos Envolvidos:**
- `src/components/board/kanban-board.tsx`
- `src/domain/workflows/task-workflow.ts`

---

### ✅ Feature 3.6: Agrupamento por Épico/Feature (Swimlanes)
**Status:** 🔴 TODO  
**Prioridade:** P2  
**Estimativa:** 5 pontos

**Descrição:**
Opção de visualizar o board com "raias" (swimlanes) horizontais por Épico ou Feature.

**Critérios de Aceite:**
- [ ] Toggle "Group by Feature"
- [ ] Renderizar linhas horizontais para cada feature
- [ ] Colunas verticais de status dentro das linhas

**Tarefas Técnicas:**
- [ ] Alterar layout do Board para suportar swimlanes
- [ ] Agrupar dados no frontend

**Arquivos Envolvidos:**
- `src/components/board/swimlanes.tsx`

---

### ✅ Feature 3.7: Sidebar de Navegação
**Status:** 🔴 TODO  
**Prioridade:** P1  
**Estimativa:** 3 pontos

**Descrição:**
Navegação principal do app para alternar entre projetos e dashboard.

**Critérios de Aceite:**
- [ ] Lista de projetos recentes
- [ ] Link para Dashboard
- [ ] Link para Settings
- [ ] User profile menu

**Tarefas Técnicas:**
- [ ] Componente `AppSidebar`
- [ ] Layout persistente

**Arquivos Envolvidos:**
- `src/components/layout/app-sidebar.tsx`

---

## Dependências

**Bloqueia:**
- Épico 05 (Poker) - poker acontece no Task Modal
- Épico 06 (QA) - QA usa o board para mover cards

**Depende de:**
- Épico 02 (CRUD Core) - precisa das tasks para exibir

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Performance do Board | Média | Alto | Virtualização se > 100 tasks |
| Complexidade DnD | Média | Médio | Usar lib robusta (dnd-kit) |

---

## Métricas de Sucesso

- [ ] Board carrega em < 1s
- [ ] Drag & Drop fluido sem lags
- [ ] Filtros funcionam instantaneamente (client-side)
