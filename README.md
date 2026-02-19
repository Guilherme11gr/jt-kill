# 🚀 Jira Killer

<div align="center">

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)
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
| **Frontend** | Next.js 16+ (App Router) / React 19 |
| **Linguagem** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS v4 + Shadcn/UI |
| **Backend/DB** | Supabase (PostgreSQL) |
| **Realtime** | Supabase Realtime |
| **AI** | OpenAI / Anthropic (Planned) |
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
# App rodará em http://localhost:3005 (ver scripts)
```

Acesse [http://localhost:3005](http://localhost:3005)

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

## 🚀 Deploy

### Vercel (Produção)

**1. Setup inicial na Vercel:**
```bash
# 1. Instale a CLI da Vercel (opcional)
npm i -g vercel

# 2. Faça login
vercel login

# 3. Link o projeto (se ainda não estiver linkado)
vercel link
```

**2. Configure Environment Variables na Vercel Dashboard:**

Acesse: [Vercel Dashboard](https://vercel.com) → Seu Projeto → Settings → Environment Variables

```bash
# Database (copie do Supabase Dashboard)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase Public Keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key

# AI API
DEEPSEEK_API_KEY=sk-your-key
```

**3. Deploy:**
```bash
# Deploy preview (branch)
git push origin your-branch
# Vercel cria preview automaticamente

# Deploy production (main)
git push origin main
# Vercel deploya automaticamente
```

**4. Verificar build:**
- Acesse a Vercel Dashboard → Deployments
- Verifique logs de build
- Teste a URL de preview/production

**⚠️ Importante:**
- **NÃO** adicionar `DEV_MOCK_AUTH` em produção
- Migrations são gerenciadas pelo Supabase (não na Vercel)
- `prisma generate` roda automaticamente via `postinstall`

### Local Development

```bash
# 1. Clone o repositório
git clone https://github.com/your-org/jira-killer.git
cd jira-killer

# 2. Instale dependências
npm install

# 3. Configure .env.local (copie de .env.production.example)
cp .env.production.example .env.local
# Edite .env.local com suas credenciais locais

# 4. Gere o Prisma Client
npm run db:generate

# 5. Rode o servidor de desenvolvimento
npm run dev
```

**Comandos úteis:**
```bash
npm run dev          # Dev server (port 3005)
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # Lint
npm run typecheck    # Type checking
npm run test         # Rodar testes
```

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

## 🤖 Kai Delegation

**AI-First Development with Intelligent Task Delegation**

The Jira Killer incorporates an advanced task delegation system for AI agents, enabling development to be accelerated through automatic and intelligent delegation of tasks to specialized AI agents.

### 🚀 Core Features

#### 1. **Kai Zone**
- Interactive chat with contextualized AI
- Real-time analysis of projects and tasks
- Intelligent responses based on project context

#### 2. **AI Scribe Integration**
- Transforms notes into structured tasks
- Automatic validation of acceptance criteria
- Intelligent task assignment for AI agents

#### 3. **Automatic Delegation**
- **GitHub Copilot Integration**: Specialized agents for different architecture layers
- **Context-Aware**: Deep understanding of code and project patterns
- **Quality Gates**: Automatic validation of builds, lint, and tests

### 🚀 Core Features

#### 1. **Kai Zone**
- Interactive chat with contextualized AI
- Real-time analysis of projects and tasks
- Intelligent responses based on project context

#### 2. **AI Scribe Integration**
- Transforms notes into structured tasks
- Automatic validation of acceptance criteria
- Intelligent task assignment for AI agents

#### 3. **Automatic Delegation**
- **GitHub Copilot Integration**: Specialized agents for different architecture layers
- **Context-Aware**: Deep understanding of code and project patterns
- **Quality Gates**: Automatic validation of builds, lint, and tests

### 📋 How It Works

#### **Kai Zone Chat**
```
🤔 You: "What are the top priorities for the SDK project?"

🤖 Kai: "Analyzing projects...

🎯 **Top Priorities**

1. **Implement intelligent cache** (TASK-789)
   - Project: SDK Core
   - Status: DOING
   
2. **Fix memory leak** (BUG-123)
   - Project: API
   - Status: BLOCKED
```

#### **Automatic Task Delegation**
- **Use Cases**: Automatic delegation to specialized agents
- **Database Migrations**: Safe validation and execution
- **Code Review**: Automatic quality analysis
- **Testing**: Test generation and validation

### 🏗️ Delegation Architecture

```
🤖 AI Agent Orchestrator
├── 💻 GitHub Copilot Agent
│   ├── Code Review ✅
│   ├── Implementation ✅
│   └── Testing ✅
├── 🔧 Kai Zone
│   ├── Project Analysis 📊
│   ├── Task Prioritization 🎯
│   └── Real-time Updates 📡
└── 🔄 AI Scribe
    ├── Brain Dump Processing 🧠
    ├── Task Structuring 📝
    └── Validation ✅
```

### 🔧 Technology Stack

| Component | Technology |
|-----------|------------|
| **AI Orchestration** | Model Context Protocol (MCP) |
| **Chat System** | Supabase Realtime |
| **Task Processing** | Node.js Scripts |
| **Database** | PostgreSQL (Supabase) |
| **Integration** | GitHub Copilot Agents |

### 🎯 Usage and Integration

#### **In Code**
- Use `@kai-delegate` to delegate specific tasks
- Use `@kai-analyze` for contextual analysis
- Use `@kai-validate` for automatic validation

#### **Examples**
```typescript
// Delegate use case implementation to AI agent
// @kai-delegate implement use case for user authentication

// Analyze code to identify patterns
// @kai-analyze refactor this component for better performance

// Validate quality before commit
// @kai-validate check this PR for architecture compliance
```

### 📊 Benefits

- **⚡ Speed**: 10x faster development
- **✅ Quality**: Automatic validation of patterns
- **🤝 Consistency**: Code following project standards
- **📊 Context**: AI with deep project understanding
- **🔄 Automation**: Automated repetitive processes

### 🔐 Security and Governance

#### **Access Control**
- Role-based permissions for AI operations
- Audit logging for all AI interactions
- Data encryption for sensitive information

#### **Quality Assurance**
- Automated testing integration
- Code review requirements
- Architecture compliance checks

### 📊 Metrics and Monitoring

#### **Performance Tracking**
- Task completion time
- AI accuracy rates
- Developer productivity metrics

#### **Cost Management**
- AI usage tracking
- Budget controls
- Cost optimization recommendations

---

<div align="center">

**Built with ❤️ for engineers who hate Jira**

</div>
