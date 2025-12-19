---
epic: "06. QA Workflow"
status: TODO
priority: P2
sprint: 4
tags: [qa, bugs, workflow]
---

# 🧪 Épico 06: QA Workflow

## Objetivo

Implementar o fluxo de garantia de qualidade, incluindo o "Ping-Pong" para ajustes rápidos e o bloqueio de features por bugs críticos.

## Problema de Negócio

- ❌ Bugs são tratados como tasks comuns
- ❌ Features são entregues com bugs conhecidos
- ❌ QA perde tempo reabrindo tickets (burocracia)
- ❌ Desenvolvedor não sabe que voltou do QA

## Solução

Fluxo diferenciado onde QA pode devolver task rapidamente (Ping-Pong) ou bloquear a feature inteira com um Bug formal.

---

## Features

### ✅ Feature 6.1: Ping-Pong Flow
**Status:** 🔴 TODO  
**Prioridade:** P2  
**Estimativa:** 5 pontos

**Descrição:**
Permitir que QA mova de `QA_READY` para `DOING` sem burocracia, mantendo o assignee.

**Critérios de Aceite:**
- [ ] Transição `QA_READY` -> `DOING` permitida
- [ ] Assignee NÃO é removido (continua com o dev)
- [ ] Notificação visual para o dev ("Returned from QA")
- [ ] Contador de "Ping-Pongs" (opcional)

**Tarefas Técnicas:**
- [ ] Ajustar validação de workflow
- [ ] UI action "Return to Dev"
- [ ] Marcador visual no card

**Arquivos Envolvidos:**
- `src/domain/workflows/task-workflow.ts`
- `src/components/tasks/task-actions.tsx`

---

### ✅ Feature 6.2: Report Bug (Feature-Centric)
**Status:** 🔴 TODO  
**Prioridade:** P2  
**Estimativa:** 5 pontos

**Descrição:**
Fluxo específico para reportar bug encontrado durante teste de uma feature.

**Critérios de Aceite:**
- [ ] Botão "Report Bug" na Feature ou Task
- [ ] Cria task com `type: BUG`
- [ ] Vincula automaticamente à Feature pai
- [ ] Status inicial: BACKLOG (ou TODO)

**Tarefas Técnicas:**
- [ ] Modal de criação de Bug simplificado
- [ ] Pré-preencher Feature ID

**Arquivos Envolvidos:**
- `src/components/bugs/report-bug-modal.tsx`

---

### ✅ Feature 6.3: Feature Blocking Logic
**Status:** 🔴 TODO  
**Prioridade:** P2  
**Estimativa:** 8 pontos

**Descrição:**
Impedir que uma Feature seja marcada como DONE se houver Bugs abertos vinculados a ela.

**Critérios de Aceite:**
- [ ] Verificar bugs abertos ao tentar mover Feature para DONE
- [ ] Bloquear transição e mostrar alerta
- [ ] Listar bugs bloqueantes no alerta

**Tarefas Técnicas:**
- [ ] Backend check `canFeatureBeDone`
- [ ] Frontend check antes da ação

**Arquivos Envolvidos:**
- `src/domain/services/feature-service.ts`

---

### ✅ Feature 6.4: Bug Dashboard & Visuals
**Status:** 🔴 TODO  
**Prioridade:** P2  
**Estimativa:** 3 pontos

**Descrição:**
Destaque visual para bugs no sistema para garantir prioridade.

**Critérios de Aceite:**
- [ ] Borda vermelha em cards de Bug
- [ ] Ícone de inseto 🐞
- [ ] Filtro rápido "Show only Bugs"

**Tarefas Técnicas:**
- [ ] Estilização condicional no `TaskCard`
- [ ] Ícones e badges

**Arquivos Envolvidos:**
- `src/components/board/task-card.tsx`

---

## Dependências

**Bloqueia:**
- Entrega final de qualidade

**Depende de:**
- Épico 03 (Board) - visualização
- Épico 02 (CRUD) - estrutura de dados

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Ping-Pong infinito | Baixa | Médio | Monitorar métrica de retornos |
| Bloqueio frustrante | Média | Médio | Permitir override por Admin se necessário |

---

## Métricas de Sucesso

- [ ] Redução no tempo de ciclo QA -> Dev -> QA
- [ ] Zero features marcadas como DONE com bugs abertos
- [ ] Visibilidade clara do passivo de bugs
