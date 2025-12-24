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

const SYSTEM_PROMPT = `Atue como PO senior. Crie descrições de tarefas claras, técnicas e objetivas em PT-BR.
Use Markdown. Estruture em: ## Objetivo e ## Critérios de Aceite (checklist).
Seja conciso. Sem emojis. Evite preâmbulos.`;

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

    let prompt = `CONTEXTO DA FEATURE:
"${input.feature.title}"
${input.feature.description || ''}
${projectDocsSection}

TAREFAS A DESCREVER:
Título: ${input.title}
Tipo: ${type}
Prioridade: ${priority}`;

    if (currentDesc) {
        prompt += `\n\nDESCRIÇÃO ATUAL (Melhorar/Refinar):\n${currentDesc}`;
    } else {
        prompt += `\n\nGere uma descrição completa com Objetivo e Critérios de Aceite via checklist.`;
    }

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
