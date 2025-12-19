---
epic: "04. AI Scribe"
status: TODO
priority: P1
sprint: 3
tags: [ai, llm, automation]
---

# 🤖 Épico 04: AI Scribe

## Objetivo

Implementar o "AI Scribe", funcionalidade que transforma anotações desestruturadas ("Brain Dumps") em tasks técnicas estruturadas, usando a documentação do projeto como contexto.

## Problema de Negócio

- ❌ Criar tasks detalhadas é chato e demorado
- ❌ Gestores escrevem pouco, devs não entendem
- ❌ Contexto técnico se perde
- ❌ Tasks ficam genéricas ("Fazer login")

## Solução

O usuário digita um texto livre, a IA lê a documentação técnica do projeto e gera Features e Tasks detalhadas, prontas para revisão.

---

## Features

### ✅ Feature 4.1: Project Docs Context
**Status:** 🔴 TODO  
**Prioridade:** P1  
**Estimativa:** 3 pontos

**Descrição:**
Preparar o mecanismo de recuperação de contexto (RAG simplificado) a partir dos Project Docs.

**Critérios de Aceite:**
- [ ] Buscar docs relevantes do projeto
- [ ] Formatar docs como contexto para o prompt
- [ ] Limitar tamanho do contexto (token limit)

**Tarefas Técnicas:**
- [ ] Service `ContextBuilder`
- [ ] Selecionar docs por projeto
- [ ] Concatenar Markdown de forma limpa

**Arquivos Envolvidos:**
- `src/domain/services/ai/context-builder.ts`

---

### ✅ Feature 4.2: Brain Dump UI
**Status:** 🔴 TODO  
**Prioridade:** P1  
**Estimativa:** 3 pontos

**Descrição:**
Interface para o usuário digitar ou colar seu "Brain Dump".

**Critérios de Aceite:**
- [ ] Textarea grande para input livre
- [ ] Seleção de Épico pai (opcional)
- [ ] Botão "Generate Tasks" com loading state

**Tarefas Técnicas:**
- [ ] Página `/app/projects/[id]/scribe`
- [ ] Componente `BrainDumpInput`

**Arquivos Envolvidos:**
- `src/app/(app)/projects/[id]/scribe/page.tsx`

---

### ✅ Feature 4.3: LLM Integration (OpenAI/Claude)
**Status:** 🔴 TODO  
**Prioridade:** P1  
**Estimativa:** 8 pontos

**Descrição:**
Integração com API de LLM para processar o texto e retornar JSON estruturado.

**Critérios de Aceite:**
- [ ] Enviar System Prompt + Contexto + User Input
- [ ] Receber JSON estrito com Features e Tasks
- [ ] Tratar erros de API e timeout
- [ ] Fallback ou retry se JSON inválido

**Tarefas Técnicas:**
- [ ] Configurar OpenAI SDK ou Anthropic SDK
- [ ] Criar `SystemPrompt` robusto (ver `docs/guides/ai-scribe.md`)
- [ ] Endpoint `/api/ai/generate-tasks`

**Arquivos Envolvidos:**
- `src/infra/adapters/ai/openai-adapter.ts`
- `src/app/api/ai/generate-tasks/route.ts`

---

### ✅ Feature 4.4: Staging Area (Review UI)
**Status:** 🔴 TODO  
**Prioridade:** P1  
**Estimativa:** 8 pontos

**Descrição:**
Interface para revisar, editar e aprovar as tasks geradas pela IA antes de salvar no banco.

**Critérios de Aceite:**
- [ ] Exibir Feature e Tasks geradas
- [ ] Permitir editar título/descrição inline
- [ ] Permitir excluir tasks indesejadas
- [ ] Botão "Approve & Save"

**Tarefas Técnicas:**
- [ ] Componente `StagingArea`
- [ ] Estado local para manipulação antes do save
- [ ] UI de diff ou destaque (opcional)

**Arquivos Envolvidos:**
- `src/components/scribe/staging-area.tsx`

---

### ✅ Feature 4.5: Save to Database
**Status:** 🔴 TODO  
**Prioridade:** P1  
**Estimativa:** 5 pontos

**Descrição:**
Persistir as tasks aprovadas no banco de dados real.

**Critérios de Aceite:**
- [ ] Criar Feature no banco
- [ ] Criar Tasks vinculadas à Feature
- [ ] Associar ao Módulo correto (se sugerido pela IA)
- [ ] Redirecionar para o Board após sucesso

**Tarefas Técnicas:**
- [ ] Transaction no banco (criar tudo ou nada)
- [ ] Feedback de sucesso

**Arquivos Envolvidos:**
- `src/domain/use-cases/ai/save-generated-tasks.ts`

---

## Dependências

**Bloqueia:**
- Nada crítico (feature isolada)

**Depende de:**
- Épico 02 (CRUD Core) - precisa criar features/tasks
- Épico 01 (Auth) - acesso seguro

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Alucinação da IA | Média | Médio | Staging Area obrigatória para revisão |
| Custo de API | Baixa | Baixo | Uso pontual, não contínuo |
| Latência | Alta | Médio | UI com feedback de progresso/loading |

---

## Métricas de Sucesso

- [ ] Tempo de geração < 15s
- [ ] > 80% das tasks geradas são aproveitadas sem edição pesada
- [ ] Usuários preferem Scribe a criar manual
