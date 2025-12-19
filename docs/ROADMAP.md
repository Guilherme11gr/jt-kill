# 🗺️ Technical Roadmap - Jira Killer

> Roadmap técnico ordenado por prioridade de desenvolvimento.  
> **Última atualização:** 2025-12-19

---

## 📋 Visão Geral

O desenvolvimento segue 3 fases:
1. **Fase 1:** Melhorias Técnicas Básicas (estabilidade e qualidade)
2. **Fase 2:** Features Core de Gerenciador de Projetos
3. **Fase 3:** AI Features (killer features)

---

## 🔧 Fase 1: Melhorias Técnicas Básicas

Foco em estabilidade, qualidade de código e infraestrutura.

| # | Feature | Status | Complexidade | Descrição |
|---|---------|--------|--------------|-----------|
| 1.1 | **Error Handling Consistente** | ⚠️ Básico | Baixa | Padronizar tratamento de erros nas APIs |
| 1.2 | **Validação de Inputs** | ⚠️ Parcial | Baixa | Zod validation em todas as rotas |
| 1.3 | **Unit Tests Básicos** | ❌ | Média | Vitest para use-cases críticos |
| 1.4 | **Paginação Cursor-Based** | ⚠️ Offset | Média | Migrar tasks API para cursor pagination |
| 1.5 | **Logging Estruturado** | ❌ | Baixa | Logs JSON para debug/produção |
| 1.6 | **Rate Limiting** | ❌ | Baixa | Proteção básica de API |

**Critério de Conclusão:** Build sem warnings, testes passando, APIs respondendo < 500ms.

---

## 📦 Fase 2: Features Core de Gerenciador

Features essenciais para um gerenciador de projetos funcional.

### 2.1 Assignee (Atribuição de Tasks)
**Prioridade:** 🔴 Alta | **Complexidade:** Média

O schema já tem `assigneeId`, falta:
- [ ] API: PATCH /api/tasks/:id com `assigneeId`
- [ ] API: GET /api/users (listar membros da org)
- [ ] Hook: `useUpdateTask` aceitar assigneeId
- [ ] UI: Dropdown de assignee no TaskDialog e TaskDetailModal

### 2.2 Comments (Comentários em Tasks)
**Prioridade:** 🔴 Alta | **Complexidade:** Média

Schema `Comment` existe, falta implementar:
- [ ] API: POST /api/tasks/:id/comments
- [ ] API: GET /api/tasks/:id/comments
- [ ] API: DELETE /api/comments/:id
- [ ] Hook: `useComments(taskId)`, `useAddComment`
- [ ] UI: Lista de comentários no TaskDetailModal

### 2.3 Project Docs (Documentação de Projeto)
**Prioridade:** 🟡 Média | **Complexidade:** Média

Schema `ProjectDoc` existe, falta:
- [ ] API: CRUD /api/projects/:id/docs
- [ ] Hook: `useProjectDocs(projectId)`
- [ ] UI: Tab "Docs" na página de projeto
- [ ] Editor Markdown simples

### 2.4 User Profile  
**Prioridade:** 🟡 Média | **Complexidade:** Baixa

- [ ] API: GET/PATCH /api/user/profile
- [ ] UI: Página de perfil com avatar
- [ ] Sync com Supabase Auth

### 2.5 Realtime Updates
**Prioridade:** 🟢 Baixa | **Complexidade:** Alta

Para Kanban colaborativo:
- [ ] Supabase Realtime subscriptions
- [ ] Invalidar React Query cache em updates externos
- [ ] Indicador de "outros editando"

---

## 🤖 Fase 3: AI Features

Killer features que diferenciam o produto.

### 3.1 AI Scribe
**Prioridade:** 🔴 Alta (após Fase 2) | **Complexidade:** Alta

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

## 📅 Ordem de Execução Sugerida

```
Fase 1 (Técnico)
├── 1.1 Error Handling
├── 1.2 Validação
└── 1.3 Tests

Fase 2 (Core Features)
├── 2.1 Assignee ← Mais crítico para uso diário
├── 2.2 Comments ← Colaboração básica
├── 2.3 Project Docs
└── 2.4 User Profile

Fase 3 (AI)
├── 3.1 AI Scribe ← Killer feature
└── 3.2 Scrum Poker
```

---

## 🎯 Próximos Passos Imediatos

1. **Agora:** Escolher item da Fase 1 para começar
2. **Curto Prazo:** Implementar Assignee (mais impacto no uso diário)
3. **Médio Prazo:** Comments + Project Docs
4. **Longo Prazo:** AI Scribe

---

*Documento gerado em 2025-12-19. Atualizar conforme progresso.*
