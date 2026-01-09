import type { AIAdapter } from '@/infra/adapters/ai';
import { filterRelevantContext } from './filter-relevant-context';
import { stripMarkdown } from '@/shared/utils/markdown-cleaner';
import { AI_TEMPERATURE_CREATIVE, AI_MAX_TOKENS_DESCRIPTION } from '@/config/ai.config';

// ============================================
// Types
// ============================================

export interface ImproveEpicDescriptionInput {
    epic: {
        title: string;
        description: string | null;
    };
    project?: {
        name: string;
        description: string | null;
    } | null;
    projectDocs?: Array<{ title: string; content: string }>;
}

export interface ImproveEpicDescriptionDeps {
    aiAdapter: AIAdapter;
}

// ============================================
// Prompt Templates
// ============================================

const SYSTEM_PROMPT = `Você é um Product Manager técnico especializado em escrever descrições de Epics claras e estratégicas.

Sua tarefa é melhorar ou gerar uma descrição de Epic em markdown bem estruturado.

A descrição DEVE seguir esta estrutura:

## Objetivo
Uma descrição clara do valor de negócio e impacto esperado da epic.

## Escopo
Principais entregas e features que fazem parte desta epic.

## Critérios de Sucesso
- [ ] Lista de critérios verificáveis que definem quando a epic está completa
- [ ] Cada critério deve ser mensurável e alinhado com objetivos de negócio
- [ ] Inclua métricas de sucesso quando relevante

Diretrizes:
- Seja conciso mas estratégico
- Foque no valor de negócio, não apenas em detalhes técnicos
- Use linguagem clara em português brasileiro
- Se a descrição atual estiver vazia, gere baseado apenas no título
- Se houver descrição, melhore-a mantendo as informações relevantes`;

// ============================================
// Use Case Implementation
// ============================================

/**
 * Improve Epic Description Use Case
 * 
 * Uses two-stage AI pipeline:
 * 1. Filter relevant docs with DeepSeek Chat (fast/cheap)
 * 2. Generate with DeepSeek Reasoner (smart/expensive)
 * 
 * @example
 * ```typescript
 * const improved = await improveEpicDescription(
 *   { epic: { title, description }, project },
 *   { aiAdapter }
 * );
 * ```
 */
export async function improveEpicDescription(
    input: ImproveEpicDescriptionInput,
    deps: ImproveEpicDescriptionDeps
): Promise<string> {
    const { aiAdapter } = deps;

    // FASE 1: Filter relevant docs (if any)
    let relevantContext = '';
    if (input.projectDocs?.length) {
        const epicContextClean = stripMarkdown(`
            Epic: ${input.epic.title}
            ${input.epic.description || ''}
        `);

        const projectContextClean = input.project
            ? stripMarkdown(`Projeto: ${input.project.name}\n${input.project.description || ''}`)
            : '';

        const objective = `${input.epic.description?.trim() ? 'Melhorar' : 'Gerar'} descrição da epic "${input.epic.title}"`;

        const filtered = await filterRelevantContext(
            {
                objective,
                allDocs: input.projectDocs,
                featureContext: `${epicContextClean}\n${projectContextClean}`,
                // maxDocsToInclude uses default from config
            },
            { aiAdapter }
        );

        relevantContext = filtered.cleanedContext;
    }

    // FASE 2: Generate with Reasoner using filtered context
    const cleanEpic = stripMarkdown(input.epic.description || '');
    const cleanProject = input.project ? stripMarkdown(input.project.description || '') : '';

    const reasonerInput = `
${input.epic.description?.trim() ? 'Melhore' : 'Gere'} descrição da epic:

EPIC:
Título: ${input.epic.title}
${cleanEpic ? `Descrição atual: ${cleanEpic}` : ''}

${cleanProject ? `PROJETO:\n${input.project!.name}\n${cleanProject}` : ''}

${input.epic.description?.trim() ? 'Melhore a descrição atual.' : 'Gere descrição completa.'}
Estrutura: ## Objetivo, ## Escopo, ## Critérios de Sucesso (checklist).
`.trim();

    const result = await aiAdapter.reasonerCompletion({
        objective: reasonerInput,
        context: relevantContext,
        systemPrompt: SYSTEM_PROMPT,
        temperature: AI_TEMPERATURE_CREATIVE,
        maxTokens: AI_MAX_TOKENS_DESCRIPTION,
    });

    return result.content.trim();
}
