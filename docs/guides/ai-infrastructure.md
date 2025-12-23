# 🤖 AI Infrastructure

> Sistema de IA integrado usando **OpenAI SDK** com **DeepSeek API** para funcionalidades inteligentes no Jira Killer.

---

## 📋 Índice

- [Overview](#-overview)
- [Arquitetura](#-arquitetura)
- [Configuração](#️-configuração)
- [Módulos](#-módulos)
  - [AI Adapter](#ai-adapter)
  - [Context Builders](#context-builders)
  - [Prompt Templates](#prompt-templates)
  - [Use Cases](#use-cases)
- [API Endpoints](#-api-endpoints)
- [Uso no Frontend](#-uso-no-frontend)
- [Extensibilidade](#-extensibilidade)

---

## 🎯 Overview

O sistema de IA do Jira Killer é projetado para **augmentar** a produtividade do usuário, oferecendo funcionalidades como:

| Feature | Status | Descrição |
|---------|--------|-----------|
| Melhorar Descrição de Task | ✅ Implementado | Refina descrições usando contexto da Feature |
| Melhorar Descrição de Feature | 🔜 Planejado | Refina descrições usando contexto do Epic |
| Gerar Tasks de Feature | 🔜 Planejado | Sugere tasks com base na descrição da Feature |
| Resumir Epic | 🔜 Planejado | Cria resumo executivo de um Epic |

### Princípios de Design

1. **Context-Aware** - Toda geração usa contexto hierárquico (Project → Epic → Feature → Task)
2. **Non-Destructive** - IA sugere, usuário decide se aplica
3. **Modular** - Fácil adicionar novos casos de uso
4. **Type-Safe** - Tipagem completa de ponta a ponta

---

## 🏗 Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Task Modal  →  fetch('/api/ai/improve-description')   │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Route (Next.js)                         │
│  src/app/api/ai/improve-description/route.ts                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. Auth  →  2. Fetch Task  →  3. Call Use Case        │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Use Case Layer                             │
│  src/domain/use-cases/ai/improve-task-description.ts           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. Build Context  →  2. Build Prompt  →  3. Call AI   │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Context Builder │  │ Prompt Template │  │   AI Adapter    │
│  Extrai dados   │  │ Formata prompt  │  │  Chama DeepSeek │
│  relevantes     │  │  estruturado    │  │  via OpenAI SDK │
└─────────────────┘  └─────────────────┘  └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌───────────────┐
                                          │  DeepSeek API │
                                          │  (LLM Cloud)  │
                                          └───────────────┘
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

```env
# .env.local

# DeepSeek API Key (obrigatório para features de IA)
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ **Importante**: Sem a `DEEPSEEK_API_KEY` configurada, as chamadas de IA irão falhar.

### Modelos Disponíveis

| Modelo | Uso Recomendado | Custo |
|--------|-----------------|-------|
| `deepseek-chat` | Chat/Descrições (default) | $ |
| `deepseek-coder` | Código/Técnico | $ |

---

## 📦 Módulos

### AI Adapter

**Localização:** `src/infra/adapters/ai/`

O adapter encapsula a comunicação com a API do DeepSeek usando o SDK oficial da OpenAI.

```typescript
// src/infra/adapters/ai/index.ts

import { aiAdapter } from '@/infra/adapters/ai';

// Chat completion simples
const result = await aiAdapter.chatCompletion({
  messages: [
    { role: 'system', content: 'Você é um assistente.' },
    { role: 'user', content: 'Olá!' }
  ],
  temperature: 0.7,
  maxTokens: 500,
});

console.log(result.content);
```

#### Métodos Disponíveis

| Método | Descrição |
|--------|-----------|
| `chatCompletion(input)` | Completion síncrono, retorna resposta completa |
| `chatCompletionStream(input)` | Streaming, retorna async generator |
| `generateText(prompt, options)` | Helper simples para prompt único |

#### Tipos

```typescript
interface ChatCompletionInput {
  messages: AIMessage[];
  model?: string;        // default: 'deepseek-chat'
  temperature?: number;  // default: 0.7
  maxTokens?: number;
}

interface ChatCompletionResult {
  content: string;
  role: 'assistant';
  finishReason: string | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

---

### Context Builders

**Localização:** `src/domain/use-cases/ai/context/`

Context builders extraem e estruturam os dados necessários para a geração de prompts.

```typescript
// Exemplo: Task Description Context

import { buildTaskDescriptionContext } from '@/domain/use-cases/ai/context';

const context = buildTaskDescriptionContext(task, feature.description);

// Resultado:
{
  task: {
    title: "Implementar login social",
    description: "Adicionar login com Google...",
    type: "TASK",
    priority: "HIGH"
  },
  feature: {
    title: "Autenticação",
    description: "Sistema de autenticação..."
  }
}
```

#### Contextos Implementados

| Context Builder | Input | Output |
|----------------|-------|--------|
| `buildTaskDescriptionContext` | Task + Feature description | `TaskDescriptionContext` |

---

### Prompt Templates

**Localização:** `src/domain/use-cases/ai/prompts/`

Templates que transformam contexto estruturado em prompts otimizados para o LLM.

```typescript
import { buildImproveDescriptionPrompt } from '@/domain/use-cases/ai/prompts';

const { systemPrompt, userPrompt } = buildImproveDescriptionPrompt(context);
```

#### Estrutura de um Prompt Template

```typescript
// System prompt define o comportamento do assistente
const SYSTEM_PROMPT = `Você é um assistente especializado em...

Diretrizes:
- Seja conciso
- Use linguagem técnica
- Escreva em português brasileiro`;

// User prompt contém o contexto e a instrução
const userPrompt = `## Contexto
Feature: ${context.feature.title}
...

## Instrução
Por favor, melhore a descrição...`;
```

#### Templates Implementados

| Template | Propósito |
|----------|-----------|
| `buildImproveDescriptionPrompt` | Melhora descrição de Task |

---

### Use Cases

**Localização:** `src/domain/use-cases/ai/`

Use cases orquestram o fluxo completo: contexto → prompt → AI → resultado.

```typescript
import { improveTaskDescription } from '@/domain/use-cases/ai';
import { aiAdapter } from '@/infra/adapters/ai';

const improvedDescription = await improveTaskDescription(
  { task, featureDescription: feature.description },
  { aiAdapter }
);
```

#### Use Cases Implementados

| Use Case | Input | Output |
|----------|-------|--------|
| `chatCompletion` | Messages + options | `ChatCompletionResult` |
| `improveTaskDescription` | Task + Feature description | `string` (nova descrição) |

---

## 🌐 API Endpoints

### `POST /api/ai/improve-description`

Melhora a descrição de uma task usando IA.

#### Request

```json
{
  "taskId": "uuid-da-task"
}
```

#### Response (Success)

```json
{
  "data": {
    "description": "Nova descrição melhorada com critérios de aceitação...",
    "taskId": "uuid-da-task"
  }
}
```

#### Response (Error)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Task não encontrada"
  }
}
```

#### Códigos de Status

| Status | Significado |
|--------|-------------|
| `200` | Sucesso |
| `400` | Dados inválidos (taskId não é UUID) |
| `401` | Não autenticado |
| `404` | Task não encontrada |
| `500` | Erro interno (falha na IA) |

---

## 💻 Uso no Frontend

### Hook Customizado (Sugestão)

```typescript
// hooks/use-improve-description.ts

import { useMutation } from '@tanstack/react-query';
import type { ImproveDescriptionRequest, ImproveDescriptionResponse } from '@/shared/types';

export function useImproveDescription() {
  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch('/api/ai/improve-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId } satisfies ImproveDescriptionRequest),
      });

      if (!response.ok) {
        throw new Error('Falha ao melhorar descrição');
      }

      const json = await response.json();
      return json.data as ImproveDescriptionResponse;
    },
  });
}
```

### Uso no Componente

```tsx
function TaskDescriptionEditor({ task }: { task: Task }) {
  const [description, setDescription] = useState(task.description);
  const improve = useImproveDescription();

  const handleImprove = async () => {
    const result = await improve.mutateAsync(task.id);
    setDescription(result.description); // Preview
  };

  return (
    <div>
      <textarea value={description} onChange={e => setDescription(e.target.value)} />
      
      <button 
        onClick={handleImprove}
        disabled={improve.isPending}
      >
        {improve.isPending ? '✨ Melhorando...' : '✨ Melhorar com IA'}
      </button>
    </div>
  );
}
```

---

## 🔌 Extensibilidade

### Adicionando Novo Caso de Uso

Para adicionar uma nova funcionalidade de IA (ex: "Gerar Tasks de Feature"):

#### 1. Criar Context Builder

```typescript
// src/domain/use-cases/ai/context/feature-tasks-context.ts

export interface FeatureTasksContext {
  feature: {
    title: string;
    description: string | null;
  };
  epic: {
    title: string;
  };
  existingTasks: string[]; // títulos das tasks existentes
}

export function buildFeatureTasksContext(
  feature: Feature,
  existingTasks: Task[]
): FeatureTasksContext {
  return {
    feature: {
      title: feature.title,
      description: feature.description,
    },
    epic: {
      title: feature.epic.title,
    },
    existingTasks: existingTasks.map(t => t.title),
  };
}
```

#### 2. Criar Prompt Template

```typescript
// src/domain/use-cases/ai/prompts/generate-feature-tasks.ts

export function buildGenerateTasksPrompt(context: FeatureTasksContext) {
  const systemPrompt = `Você é um gerente de projetos...`;
  
  const userPrompt = `## Feature: ${context.feature.title}
${context.feature.description}

## Tasks Existentes
${context.existingTasks.map(t => `- ${t}`).join('\n')}

Sugira mais tasks para completar esta feature.`;

  return { systemPrompt, userPrompt };
}
```

#### 3. Criar Use Case

```typescript
// src/domain/use-cases/ai/generate-feature-tasks.ts

export async function generateFeatureTasks(
  input: { feature: Feature; existingTasks: Task[] },
  deps: { aiAdapter: AIAdapter }
): Promise<string[]> {
  const context = buildFeatureTasksContext(input.feature, input.existingTasks);
  const { systemPrompt, userPrompt } = buildGenerateTasksPrompt(context);
  
  const result = await deps.aiAdapter.chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  
  // Parse resultado (assumindo formato de lista)
  return result.content.split('\n').filter(line => line.startsWith('-'));
}
```

#### 4. Criar API Route

```typescript
// src/app/api/ai/generate-tasks/route.ts

export async function POST(request: NextRequest) {
  // Auth, fetch feature, call use case...
}
```

#### 5. Atualizar Barrel Exports

```typescript
// src/domain/use-cases/ai/index.ts
export * from './generate-feature-tasks';

// src/domain/use-cases/ai/context/index.ts
export * from './feature-tasks-context';

// src/domain/use-cases/ai/prompts/index.ts
export * from './generate-feature-tasks';
```

---

## 📁 Estrutura de Arquivos

```
src/
├── infra/adapters/ai/
│   ├── index.ts              # Singleton + exports
│   ├── ai.adapter.ts         # Classe AIAdapter
│   └── types.ts              # Tipos do adapter
│
├── domain/use-cases/ai/
│   ├── index.ts              # Barrel export
│   ├── chat-completion.ts    # Use case base
│   ├── chat-completion.md    # Doc
│   ├── improve-task-description.ts
│   ├── improve-task-description.md
│   ├── context/
│   │   ├── index.ts
│   │   └── task-description-context.ts
│   └── prompts/
│       ├── index.ts
│       └── improve-task-description.ts
│
├── app/api/ai/
│   └── improve-description/
│       └── route.ts
│
└── shared/types/
    └── ai.types.ts           # Tipos compartilhados
```

---

*Última atualização: Dezembro 2025*
