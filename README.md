# 🚀 FluXo

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

**FluXo** é um gerenciador de projetos que:
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
git clone https://github.com/seu-usuario/fluxo.git
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

## 🤖 Kai Delegation

**Kai** é o assistente de IA integrado ao FluXo que automatiza a delegação de tarefas através do Model Context Protocol (MCP).

### 📋 Funcionalidades Principais

- **AI Scribe:** Transforma anotações desestruturadas em tasks estruturadas
- **MCP Integration:** 27 tools para gerenciamento nativo de tasks
- **Telegram Proxy:** Comunicação bidirecional com o bot @kai_jt_assistant_bot
- **Execution Tracking:** Monitoramento em tempo real de comandos executados

### 🚀 Como Usar

#### 1. Kai Zone (Interface Web)
- Acesse `/kai` para conversar com o assistente
- Suas mensagens são processadas e respondidas via MCP
- Histórico salvo no banco de dados

#### 2. Telegram Integration
- Inicie conversa com @kai_jt_assistant_bot
- Responda mensagens do Kai Zone diretamente no Telegram
- Notificações em tempo real

#### 3. AI Scribe
- Use o botão "Executar com Kai" em qualquer task
- O assistente analisa o contexto e delega automaticamente
- Tasks são criadas com base em documentação do projeto

### 📊 Comandos Disponíveis

```bash
# Listar comandos do Kai
npm run kai:list

# Executar comando específico
npm run kai:execute [command-id]

# Ver execuções recentes
npm run kai:executions
```

### 🔧 Configuração

1. Configure as variáveis de ambiente em `.env.local`:
```bash
# OpenAI/Claude API Keys
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=sk-your-key

# Telegram Bot Token (opcional)
TELEGRAM_BOT_TOKEN=your-bot-token
```

2. Instale o MCP Server:
```bash
cd mcp-server
npm install
npm run build
```

3. Inicie o servidor MCP:
```bash
npm run dev
```

### 📁 Estrutura do MCP

```
mcp-server/
├── src/
│   ├── index.ts              # Entrada principal
│   ├── tools/               # 27 tools de gerenciamento
│   │   ├── tasks.ts        # CRUD de tasks
│   │   ├── epics.ts         # CRUD de epics
│   │   ├── features.ts      # CRUD de features
│   │   └── bulk.ts          # Operações em massa
│   └── utils/
│       └── api-client.ts     # Cliente HTTP para API do FluXo
└── dist/                    # Build output
```

### 🎯 Benefícios

- **Automação Completa:** Delegação de tarefas sem intervenção manual
- **Context-Aware:** Usa documentação do projeto para decisões inteligentes
- **Multiplataforma:** Web, Telegram e API nativa
- **Traceability:** Log completo de todas as execuções e decisões

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
git clone https://github.com/your-org/fluxo.git
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

<div align="center">

**Built with ❤️ for engineers who hate Jira**

</div>
