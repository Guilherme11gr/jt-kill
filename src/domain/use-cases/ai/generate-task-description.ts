import type { TaskType, TaskPriority } from '@/shared/types';
import type { AIAdapter } from '@/infra/adapters/ai';
import type { Feature } from '@/shared/types';

export interface GenerateTaskDescriptionInput {
    title: string;
    type?: TaskType;
    priority?: TaskPriority;
    currentDescription?: string | null;
    feature: {
        title: string;
        description: string | null;
    };
    projectDocs?: Array<{ title: string; content: string }>;
}

export interface GenerateTaskDescriptionDeps {
    aiAdapter: AIAdapter;
}

const SYSTEM_PROMPT = `Você é um assistente especializado em gestão de projetos de software.
Seu papel é criar descrições de tarefas que sejam claras, objetivas e acionáveis.

Diretrizes:
- Crie uma descrição concisa mas completa
- Use markdown para estruturar (## Objetivo, ## Critérios de Aceite, etc)
- Inclua critérios de aceitação como checklist (- [ ] item)
- Considere o contexto da feature pai
- Escreva em português brasileiro
- Não use emojis
- Seja técnico mas acessível`;

const TYPE_LABELS: Record<string, string> = {
    TASK: 'Tarefa',
    BUG: 'Bug',
};

const PRIORITY_LABELS: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    CRITICAL: 'Crítica',
};

function buildPrompt(input: GenerateTaskDescriptionInput): string {
    const type = TYPE_LABELS[input.type || 'TASK'] || 'Tarefa';
    const priority = PRIORITY_LABELS[input.priority || 'MEDIUM'] || 'Média';
    const currentDesc = input.currentDescription?.trim();

    // Build project docs section if available
    const projectDocsSection = input.projectDocs?.length
        ? `
---

## Documentação do Projeto

${input.projectDocs.map(doc => `### ${doc.title}\n${doc.content}`).join('\n\n')}
`
        : '';

    let prompt = `## Contexto da Feature

**Feature:** ${input.feature.title}
${input.feature.description || '(sem descrição)'}
${projectDocsSection}
---

## Task a ser descrita

**Título:** ${input.title}
**Tipo:** ${type}
**Prioridade:** ${priority}
`;

    if (currentDesc) {
        prompt += `
**Descrição atual (para melhorar):**
${currentDesc}

---

Melhore a descrição acima, tornando-a mais clara e adicionando critérios de aceite se não existirem.`;
    } else {
        prompt += `
---

Crie uma descrição completa para esta task, incluindo:
1. Objetivo claro
2. Contexto relevante
3. Critérios de aceite como checklist`;
    }

    prompt += `

**Retorne APENAS a descrição em markdown, sem prefixos como "Aqui está" ou explicações.**`;

    return prompt;
}

/**
 * Generate Task Description Use Case
 * 
 * Generates a new description for a task based on title and feature context.
 * Can also improve existing descriptions.
 */
export async function generateTaskDescription(
    input: GenerateTaskDescriptionInput,
    deps: GenerateTaskDescriptionDeps
): Promise<string> {
    const { aiAdapter } = deps;

    const userPrompt = buildPrompt(input);

    const result = await aiAdapter.chatCompletion({
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 1500,
    });

    return result.content.trim();
}
