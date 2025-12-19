---
epic: "05. Scrum Poker"
status: TODO
priority: P2
sprint: 4
tags: [realtime, poker, estimation]
---

# 🃏 Épico 05: Scrum Poker

## Objetivo

Implementar sistema de estimativa (Planning Poker) integrado diretamente no modal da task, permitindo votação em tempo real sem sair do contexto.

## Problema de Negócio

- ❌ Ferramentas externas de poker quebram o fluxo
- ❌ "Qual task estamos votando?" (perda de contexto)
- ❌ Histórico de votos se perde
- ❌ Reuniões de planning demoradas

## Solução

Poker "In-Place": abra a task, inicie a votação, time vota ali mesmo, moderador revela e aplica a média/consenso.

---

## Features

### ✅ Feature 5.1: Realtime Voting Engine
**Status:** 🔴 TODO  
**Prioridade:** P2  
**Estimativa:** 8 pontos

**Descrição:**
Backend realtime para gerenciar sessões de votação por task.

**Critérios de Aceite:**
- [ ] Sincronizar estado da votação (VOTING, REVEALED)
- [ ] Receber votos dos usuários em tempo real
- [ ] Esconder votos até o reveal
- [ ] Identificar quem já votou

**Tarefas Técnicas:**
- [ ] Tabela `poker_votes`
- [ ] Supabase Realtime Subscription na tabela
- [ ] Hooks de realtime (`usePokerSession`)

**Arquivos Envolvidos:**
- `src/hooks/use-poker.ts`
- `src/infra/realtime/supabase-channel.ts`

---

### ✅ Feature 5.2: Voting UI (Cards)
**Status:** 🔴 TODO  
**Prioridade:** P2  
**Estimativa:** 5 pontos

**Descrição:**
Interface para o usuário selecionar sua carta de estimativa.

**Critérios de Aceite:**
- [ ] Baralho Fibonacci (1, 2, 3, 5, 8, 13, 21, ?)
- [ ] Feedback visual de seleção
- [ ] Bloquear mudança após reveal (opcional)

**Tarefas Técnicas:**
- [ ] Componente `PokerCards`
- [ ] Integração com hook de votação

**Arquivos Envolvidos:**
- `src/components/poker/poker-cards.tsx`

---

### ✅ Feature 5.3: Reveal & Results
**Status:** 🔴 TODO  
**Prioridade:** P2  
**Estimativa:** 5 pontos

**Descrição:**
Interface para revelar votos e mostrar distribuição.

**Critérios de Aceite:**
- [ ] Botão "Reveal" (apenas para quem iniciou ou qualquer um)
- [ ] Mostrar votos de cada participante (Avatar + Carta)
- [ ] Calcular média simples
- [ ] Destacar consenso ou divergência

**Tarefas Técnicas:**
- [ ] Componente `PokerResults`
- [ ] Lógica de cálculo de média

**Arquivos Envolvidos:**
- `src/components/poker/poker-results.tsx`

---

### ✅ Feature 5.4: Apply Points
**Status:** 🔴 TODO  
**Prioridade:** P2  
**Estimativa:** 3 pontos

**Descrição:**
Ação final de aplicar a estimativa escolhida à task.

**Critérios de Aceite:**
- [ ] Botão "Apply X Points"
- [ ] Atualizar campo `points` da task
- [ ] Resetar sessão de votação após aplicar
- [ ] Registrar no histórico (comentário de sistema)

**Tarefas Técnicas:**
- [ ] Integração com `updateTask`
- [ ] Limpeza da tabela `poker_votes` para a task

**Arquivos Envolvidos:**
- `src/components/poker/poker-controls.tsx`

---

## Dependências

**Bloqueia:**
- Nada

**Depende de:**
- Épico 03 (Task Modal) - o poker vive dentro do modal
- Épico 01 (Auth) - identificar quem votou

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Conexão Realtime falhar | Baixa | Médio | Fallback para polling ou refresh manual |
| Concorrência de votos | Baixa | Baixo | Supabase trata bem |

---

## Métricas de Sucesso

- [ ] Votos aparecem para outros usuários em < 500ms
- [ ] Planning flui sem necessidade de ferramenta externa
- [ ] Aumento no % de tasks pontuadas
