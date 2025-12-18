---
tags: [guides, ai, features]
priority: medium
last-updated: 2025-12
---

# 🤖 AI Scribe - Guia de Implementação

> Sistema de IA que transforma "Brain Dumps" em tasks estruturadas.

## Conceito

O **AI Scribe** é a killer feature do Jira Killer. Ele:
1. Recebe anotações desestruturadas do gestor
2. Usa o contexto do projeto (Project Docs) como referência
3. Gera tasks técnicas estruturadas
4. Permite revisão antes de salvar

---

## Fluxo de Uso

```
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│  1. INPUT: Brain Dump                                             │
│     ┌─────────────────────────────────────────────────────────┐  │
│     │ "precisa implementar login social com google e apple,    │  │
│     │  lembrar de adicionar refresh token e tratar quando      │  │
│     │  o usuário cancela no meio do fluxo"                     │  │
│     └─────────────────────────────────────────────────────────┘  │
│                                │                                  │
│                                ▼                                  │
│  2. PROCESSING                                                    │
│     • Busca Project Docs do projeto                              │
│     • Monta contexto para a LLM                                  │
│     • Envia para GPT-4o-mini / Claude                            │
│                                │                                  │
│                                ▼                                  │
│  3. STAGING AREA (Revisão)                                        │
│     ┌─────────────────────────────────────────────────────────┐  │
│     │ Feature: Autenticação Social                            │  │
│     │                                                          │  │
│     │ ├── [TASK] Implementar OAuth Google                      │  │
│     │ │   Module: AUTH                                         │  │
│     │ │   Descrição: Integrar Google Sign-In...               │  │
│     │ │                                                        │  │
│     │ ├── [TASK] Implementar OAuth Apple                       │  │
│     │ │   Module: AUTH                                         │  │
│     │ │                                                        │  │
│     │ ├── [TASK] Implementar refresh token                     │  │
│     │ │   Module: AUTH                                         │  │
│     │ │                                                        │  │
│     │ └── [TASK] Tratar cancelamento de fluxo                  │  │
│     │     Module: AUTH                                         │  │
│     │                                                          │  │
│     │ [✏️ Editar] [✅ Aprovar] [🗑️ Descartar]                   │  │
│     └─────────────────────────────────────────────────────────┘  │
│                                │                                  │
│                                ▼                                  │
│  4. SAVE (Após aprovação)                                         │
│     • Cria Feature no banco                                      │
│     • Cria Tasks vinculadas                                      │
│     • Status inicial: BACKLOG                                    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Arquitetura Backend

### Endpoint

```typescript
// app/api/ai/generate-tasks/route.ts

interface GenerateTasksInput {
  projectId: string;
  epicId: string;      // Epic onde criar a Feature
  brainDump: string;   // Texto livre do usuário
}

interface GeneratedTask {
  title: string;
  description: string;
  type: 'TASK' | 'BUG';
  module?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface GenerateTasksOutput {
  feature: {
    title: string;
    description: string;
  };
  tasks: GeneratedTask[];
}
```

### Fluxo do Backend

```typescript
export async function POST(request: Request) {
  // 1. Auth
  const { tenantId } = await extractAuthenticatedTenant(supabase);
  
  // 2. Parse input
  const { projectId, epicId, brainDump } = await request.json();
  
  // 3. Buscar Project Docs (contexto)
  const docs = await supabase
    .from('project_docs')
    .select('title, content')
    .eq('project_id', projectId);
  
  // 4. Montar contexto
  const context = docs.data
    .map(d => `## ${d.title}\n${d.content}`)
    .join('\n\n');
  
  // 5. Chamar LLM
  const result = await generateWithAI({
    systemPrompt: buildSystemPrompt(context),
    userPrompt: brainDump,
  });
  
  // 6. Retornar para staging (não salva ainda!)
  return NextResponse.json(result);
}
```

---

## System Prompt

```typescript
function buildSystemPrompt(projectContext: string): string {
  return `
Você é um Technical Product Manager experiente.

## Seu Papel
Transformar anotações desestruturadas em tasks técnicas bem estruturadas.

## Contexto do Projeto
${projectContext}

## Regras
1. Cada task deve ser ATÔMICA (uma única responsabilidade)
2. Títulos devem ser claros e começar com verbo
3. Descrições devem ter critérios de aceite quando aplicável
4. Se parecer um bug, marque como type: "BUG"
5. Sugira o módulo mais apropriado baseado no contexto
6. Prioridade padrão é MEDIUM, use HIGH/CRITICAL apenas quando evidente

## Output Format (JSON)
{
  "feature": {
    "title": "string - Título da feature",
    "description": "string - Descrição da feature"
  },
  "tasks": [
    {
      "title": "string - Começar com verbo (Implementar, Corrigir, etc)",
      "description": "string - Descrição técnica com critérios",
      "type": "TASK | BUG",
      "module": "string | null",
      "priority": "LOW | MEDIUM | HIGH | CRITICAL"
    }
  ]
}

Retorne APENAS o JSON, sem texto adicional.
`.trim();
}
```

---

## Staging Area (Frontend)

### Componente

```typescript
// components/features/ai-scribe/staging-area.tsx

interface StagingAreaProps {
  suggestion: GenerateTasksOutput;
  projectModules: string[];
  onApprove: (data: GenerateTasksOutput) => void;
  onDiscard: () => void;
}

function StagingArea({ 
  suggestion, 
  projectModules,
  onApprove, 
  onDiscard 
}: StagingAreaProps) {
  const [editedData, setEditedData] = useState(suggestion);
  
  return (
    <div className="space-y-4">
      {/* Feature Header */}
      <Card>
        <Input 
          value={editedData.feature.title}
          onChange={(e) => updateFeatureTitle(e.target.value)}
        />
        <Textarea 
          value={editedData.feature.description}
          onChange={(e) => updateFeatureDescription(e.target.value)}
        />
      </Card>
      
      {/* Tasks List */}
      {editedData.tasks.map((task, index) => (
        <TaskEditor 
          key={index}
          task={task}
          modules={projectModules}
          onChange={(updated) => updateTask(index, updated)}
          onRemove={() => removeTask(index)}
        />
      ))}
      
      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onDiscard}>
          Descartar
        </Button>
        <Button onClick={() => onApprove(editedData)}>
          Aprovar e Criar
        </Button>
      </div>
    </div>
  );
}
```

---

## Validações

### Antes de Enviar para IA

```typescript
function validateBrainDump(input: string): void {
  if (!input.trim()) {
    throw new ValidationError('Brain dump não pode ser vazio');
  }
  
  if (input.length < 10) {
    throw new ValidationError('Brain dump muito curto');
  }
  
  if (input.length > 5000) {
    throw new ValidationError('Brain dump muito longo (máx 5000 caracteres)');
  }
}
```

### Antes de Salvar

```typescript
function validateStagedData(data: GenerateTasksOutput, modules: string[]): void {
  if (!data.feature.title.trim()) {
    throw new ValidationError('Feature precisa de título');
  }
  
  if (data.tasks.length === 0) {
    throw new ValidationError('Precisa de pelo menos uma task');
  }
  
  for (const task of data.tasks) {
    if (!task.title.trim()) {
      throw new ValidationError('Todas as tasks precisam de título');
    }
    
    if (task.module && !modules.includes(task.module)) {
      throw new ValidationError(`Módulo '${task.module}' não existe no projeto`);
    }
    
    if (task.type === 'BUG' && !task.description) {
      throw new ValidationError('Bugs precisam de descrição');
    }
  }
}
```

---

## Configuração de IA

### OpenAI

```typescript
// infra/adapters/ai/openai.ts

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateWithOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<GenerateTasksOutput> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 2000,
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### Anthropic (Alternativa)

```typescript
// infra/adapters/ai/anthropic.ts

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateWithClaude(
  systemPrompt: string,
  userPrompt: string
): Promise<GenerateTasksOutput> {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });
  
  // Claude não tem json_mode, precisa extrair
  const content = response.content[0].text;
  return JSON.parse(content);
}
```

---

## Rate Limiting

```typescript
// Limite por usuário
const AI_RATE_LIMIT = {
  requests: 10,
  window: '1h',
};

// No endpoint
const limiter = new RateLimiter(AI_RATE_LIMIT);
if (!limiter.check(userId)) {
  return NextResponse.json(
    { error: 'Limite de requisições atingido' },
    { status: 429 }
  );
}
```

---

## Custos Estimados

| Modelo | Custo/1K tokens | Média/request | Custo/request |
|--------|-----------------|---------------|---------------|
| GPT-4o-mini | $0.00015 | ~1500 tokens | ~$0.0002 |
| Claude 3.5 Sonnet | $0.003 | ~1500 tokens | ~$0.0045 |

**Recomendação:** Começar com GPT-4o-mini (custo 22x menor) e migrar para Claude se qualidade não for suficiente.

---

## Ver Também

- [../architecture/workflows.md](../architecture/workflows.md) - Fluxo completo
- [scrum-poker.md](./scrum-poker.md) - Outra feature realtime
