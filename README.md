# 🚀 Jira Killer

<div align="center">

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)

**Gerenciador de projetos focado em engenharia**  
*"Opinionated" • "Low Friction" • "AI-First"*

</div>

---

## 💡 O Problema

Ferramentas existentes como Jira e Notion são:
- **Jira:** Complexo demais, configuração infinita, overhead operacional
- **Notion:** Flexível demais, sem estrutura, difícil rastrear progresso

## ✨ A Solução

**Jira Killer** é um gerenciador de projetos que:
- **Opinionated:** Workflow rígido e validado (BACKLOG → TODO → DOING → REVIEW → QA_READY → DONE)
- **Low Friction:** Zero configuração, funciona out-of-the-box
- **AI-First:** Transforma anotações desestruturadas em tasks técnicas

---

## 🎯 Killer Feature: AI Scribe

> *"Escreva como pensa, a IA estrutura pra você"*

O **AI Scribe** é o compilador de tasks que:
1. Recebe anotações rápidas ("Brain Dump")
2. Lê o contexto do projeto (Project Docs)
3. Retorna tasks estruturadas com título, descrição técnica e subtasks
4. Permite revisão antes de salvar (Staging Area)

```
📝 Brain Dump                    🤖 AI Scribe                    ✅ Tasks Estruturadas
"precisa arrumar o bug          →  Analisa contexto do projeto   →  [BUG] Fix autenticação OAuth
do login que tá quebrando          e docs técnicos                   - Descrição técnica
quando o token expira"                                               - Critérios de aceite
                                                                     - Módulo: AUTH
```

---

## 🏗️ Arquitetura

### Hierarquia de Entidades (Rígida)

```
🏢 Organization (Tenant)
└── 📦 Project (Produto)
    ├── 📚 Project Docs (Memória da IA)
    ├── 🏷️ Modules: [SDK, API, WEB...]
    └── 🎯 Epic (Objetivo Macro)
        └── ⭐ Feature (Entregável)
            └── ✅ Task / 🐛 Bug
```

### Workflow de QA Inteligente

**Cenário A: Ping-Pong (Ajustes menores)**
- QA move card de `QA_READY` → `DOING`
- Mesmo assignee, dev é notificado

**Cenário B: Bug Real**
- QA clica "Report Bug" na Feature
- Sistema cria Task tipo `BUG` vinculada
- Feature fica bloqueada até bugs serem resolvidos

---

## 🖥️ Dashboard "My Focus"

A tela inicial do desenvolvedor é projetada para **contexto técnico**:

```
┌─────────────────────────────────────────────────────────┐
│  🔴 Meus Bugs e Bloqueios                               │
│  ┌─────────────┐  ┌─────────────┐                       │
│  │ BUG-123     │  │ BUG-456     │                       │
│  │ Auth broken │  │ API timeout │                       │
│  └─────────────┘  └─────────────┘                       │
├─────────────────────────────────────────────────────────┤
│  📦 SDK Core                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ TASK-789    │  │ TASK-012    │  │ TASK-345    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│  🌐 API                                                 │
│  ┌─────────────┐  ┌─────────────┐                       │
│  │ TASK-678    │  │ TASK-901    │                       │
│  └─────────────┘  └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🃏 Scrum Poker (In-Place)

Estimativa sem sair do contexto da task:

- Votação dentro do Modal de detalhes
- Realtime via Supabase
- Votos ocultos até "Revelar"
- Média calculada automaticamente

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | Next.js 14+ (App Router) |
| **Linguagem** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS + Shadcn/UI |
| **Backend/DB** | Supabase (PostgreSQL) |
| **Realtime** | Supabase Realtime |
| **AI** | OpenAI / Anthropic |
| **ORM** | Prisma |

---

## 🚀 Quick Start

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/jira-killer.git
cd jira-killer

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# Rode o projeto
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## 📁 Estrutura do Projeto

```
src/
├── app/              # Routes (thin controllers)
├── domain/
│   └── use-cases/    # Regras de negócio puras
├── infra/
│   └── adapters/     # Supabase, APIs externas
├── server/           # Services server-only
├── shared/           # DTOs, types, validators
├── hooks/            # React hooks
└── components/       # UI components

docs/
├── AI-CONTEXT.md     # 🤖 Contexto para AI Agents
├── architecture/     # Decisões arquiteturais
├── guides/           # Guias práticos
├── ui-ux/            # Design system
└── database/         # Schema e migrations
```

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [docs/AI-CONTEXT.md](docs/AI-CONTEXT.md) | Contexto completo para AI |
| [docs/architecture/](docs/architecture/) | Decisões arquiteturais |
| [docs/guides/](docs/guides/) | Guias práticos |
| [docs/database/](docs/database/) | Schema do banco |

---

## 🎨 Design Principles

- **Dark Mode First:** Tema escuro como padrão
- **Informação Densa:** Máximo de info em pouco espaço
- **Zero Config:** Funciona sem configuração
- **Consistência Visual:** Cores semânticas (bugs = vermelho)

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/amazing-feature`)
3. Commit suas mudanças (`git commit -m 'feat: add amazing feature'`)
4. Push para a branch (`git push origin feature/amazing-feature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é privado e de uso interno.

---

<div align="center">

**Built with ❤️ for engineers who hate Jira**

</div>
