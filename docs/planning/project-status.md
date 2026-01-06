---
tags: [planning, status]
priority: medium
last-updated: 2025-12
---

# 📊 Project Status

## Visão Geral

| Métrica | Status |
|---------|--------|
| **Fase** | Planejamento/Setup |
| **Sprint** | 0 (Inicialização) |
| **Meta** | MVP em 2 semanas |
| **Stack** | Next.js 14 + Supabase + Tailwind |

---

## Milestones

### 🎯 Sprint 0 - Setup (Atual)
- [x] Documentação de arquitetura
- [x] Documentação de contexto IA
- [x] Schema do banco definido
- [x] Design system definido
- [x] Projeto Next.js inicializado
- [x] Supabase configurado
- [x] Configurações de deploy para Vercel
- [ ] CI/CD em produção (aguardando primeiro deploy)

### 📋 Sprint 1 - Core CRUD
- [ ] Auth + Multi-tenancy
- [ ] CRUD Organizations
- [ ] CRUD Projects
- [ ] CRUD Epics
- [ ] CRUD Features
- [ ] CRUD Tasks

### 🎨 Sprint 2 - UI Principal
- [ ] Dashboard "My Focus"
- [ ] Kanban Board
- [ ] Task Modal
- [ ] Filtros e busca

### 🤖 Sprint 3 - AI Scribe
- [ ] Integração OpenAI/Claude
- [ ] Brain Dump → Tasks
- [ ] Staging Area
- [ ] Project Docs CRUD

### 🃏 Sprint 4 - Poker + QA
- [ ] Scrum Poker realtime
- [ ] Fluxo de QA
- [ ] Report Bug
- [ ] Feature blocking

---

## Features por Status

### ✅ Definido/Documentado
- Modelo de domínio
- Workflow de tasks
- AI Scribe spec
- Scrum Poker spec
- Design system
- Schema do banco

### 🚧 Em Progresso
- Setup do projeto

### ❌ Não Iniciado
- Implementação de código
- Testes
- Deploy

---

## Tech Debt
*Nenhum ainda - projeto novo*

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Custo de IA | Média | Baixo | Usar GPT-4o-mini (custo baixo) |
| Realtime scaling | Baixa | Médio | Supabase gerencia |
| Prazo 2 semanas | Alta | Alto | MVP focado, sem extras |

---

## Próximas Ações

1. **Inicializar projeto Next.js**
2. **Configurar Supabase + Prisma**
3. **Criar estrutura de pastas**
4. **Implementar auth básico**
5. **CRUD de Projects/Tasks**

---

*Última atualização: 18/12/2025*
