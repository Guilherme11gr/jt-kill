
const tasks = [
  {
    title: "Backend: Feature Repository & AI Use Case",
    featureId: "22c3ef25-7916-4f50-aa65-97e175942660",
    description: `## Implementação do Use Case generateFeatureSummary

### Objetivo
Criar a lógica de negócio principal para geração de resumos de features utilizando DeepSeek Reasoner, com foco em análise profunda de tasks e comentários.

### Escopo
1. **FeatureRepository**:
   - Adicionar método \`findByIdWithTasksAndComments(featureId, orgId)\`
   - Trazer tasks com \`description\`, \`status\`, \`type\`
   - Trazer \`comments\` recentes (limitar a 10 últimos ou por data)

2. **Use Case \`generateFeatureSummary\`**:
   - Local: \`src/domain/use-cases/ai/generate-feature-summary.ts\`
   - Input: \`featureId\`, \`forceRegenerate\`
   - Lógica: Filtrar dados irrelevantes, formatar prompt para Reasoner.
   - **Prompt**: Foco em "O que aconteceu?", "Bloqueios resolvidos", "Discussões nos comentários". Ignorar status do Épico.

### Critérios de Aceite
- [ ] Repository retorna dados aninhados corretamente sem N+1
- [ ] Use Case formata o prompt seguindo as diretrizes de "Análise de Tarefas"
- [ ] Prompt instrui o modelo a usar emojis e ser direto
- [ ] Testes unitários cobrindo o fluxo de dados`,
    priority: "HIGH",
    type: "TASK"
  },
  {
    title: "Backend: AI Adapter & Streaming Support",
    featureId: "22c3ef25-7916-4f50-aa65-97e175942660",
    description: `## Suporte a Streaming e DeepSeek Reasoner

### Objetivo
Atualizar o \`AIAdapter\` para suportar o modelo DeepSeek Reasoner e garantir que o streaming de resposta funcione corretamente, capturando inclusive o \`reasoning_content\` se disponível.

### Escopo
1. **AIAdapter** (\`src/infra/adapters/ai/ai.adapter.ts\`):
   - Verificar método \`chatCompletionStream\`
   - Assegurar que o parâmetro \`model\` possa ser \`deepseek-reasoner\`
   - Tratar chunks de resposta para garantir que o frontend receba o texto progressivamente.

### Critérios de Aceite
- [ ] \`AIAdapter\` aceita modelo Reasoner
- [ ] Streaming funciona sem bufferizar toda a resposta
- [ ] Tratamento de erro para falhas na API da DeepSeek`,
    priority: "HIGH",
    type: "TASK"
  },
  {
    title: "API Layer: Endpoint de Resumo com Stream",
    featureId: "22c3ef25-7916-4f50-aa65-97e175942660",
    description: `## Endpoint API para Geração de Resumo

### Objetivo
Expor o use case \`generateFeatureSummary\` através de uma rota Next.js Edge ou NodeJS que suporte streaming de resposta para a UI.

### Escopo
1. **Nova Rota**: \`src/app/api/ai/generate-feature-summary/route.ts\`
   - Método: POST
   - Body: \`{ featureId: string }\`
   - Response: \`StreamingTextResponse\` (ou equivalente do Vercel AI SDK / nativo)

2. **Conexão**:
   - Instanciar \`AIAdapter\` e \`FeatureRepository\`
   - Chamar use case

### Critérios de Aceite
- [ ] Endpoint seguro (validação de sessão/token)
- [ ] Resposta em stream (texto aparece conforme gerado)
- [ ] Tratamento de erros (404 se feature não existe, 500 erro de IA)`,
    priority: "MEDIUM",
    type: "TASK"
  }
];

async function createTasks() {
  console.log("Creating 3 tasks...");

  for (const task of tasks) {
    try {
      const response = await fetch("https://jt-kill.vercel.app/api/agent/tasks", {
        method: "POST",
        headers: {
          "Authorization": "Bearer agk_5f8d2e1b9c3a4b7d8e9f0a1b2c3d4e5f",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(task)
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`Failed to create task "${task.title}": ${response.status} - ${text}`);
      } else {
        const json = await response.json();
        // Assumes response structure { success: true, data: { id: "..." } } based on docs
        console.log(`Created: ${task.title} (ID: ${json.data?.id})`);
      }
    } catch (error) {
      console.error(`Error creating task "${task.title}":`, error);
    }
  }
}

createTasks();
