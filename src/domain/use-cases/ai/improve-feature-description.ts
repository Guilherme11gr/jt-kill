import type { AIAdapter } from '@/infra/adapters/ai';

// ============================================
// Types
// ============================================

export interface ImproveFeatureDescriptionInput {
    feature: {
        title: string;
        description: string | null;
    };
    epic?: {
        title: string;
        description: string | null;
    } | null;
    projectDocs?: Array<{ title: string; content: string }>;
}

export interface ImproveFeatureDescriptionDeps {
    aiAdapter: AIAdapter;
}

// ============================================
// Prompt Templates
// ============================================

const SYSTEM_PROMPT = `Você é um Product Manager técnico especializado em escrever descrições de Features claras e acionáveis.

Sua tarefa é melhorar ou gerar uma descrição de Feature em markdown bem estruturado.

A descrição DEVE seguir esta estrutura:

## Objetivo
Uma descrição clara do que a feature deve entregar e por que é importante.

## Contexto
Informações de background, dependências ou considerações técnicas relevantes.

## Critérios de Aceite
- [ ] Lista de critérios verificáveis que definem quando a feature está completa
- [ ] Cada critério deve ser específico e testável
- [ ] Inclua cenários de sucesso e edge cases importantes

Diretrizes:
- Seja conciso mas completo
- Use linguagem técnica apropriada
- Escreva em português brasileiro
- Se a descrição atual estiver vazia, gere baseado apenas no título
- Se houver descrição, melhore-a mantendo as informações relevantes`;

function buildUserPrompt(input: ImproveFeatureDescriptionInput): string {
    const epicSection = input.epic
        ? `## Epic Pai
**Título:** ${input.epic.title}
${input.epic.description || '(sem descrição)'}

---

`
        : '';

    const docsSection = input.projectDocs?.length
        ? `## Documentação do Projeto

${input.projectDocs.map(doc => `### ${doc.title}\n${doc.content}`).join('\n\n')}

---

`
        : '';

    const currentDescription = input.feature.description?.trim()
        ? `## Descrição Atual
${input.feature.description}

---

`
        : '';

    return `${epicSection}${docsSection}${currentDescription}## Feature
**Título:** ${input.feature.title}

Por favor, ${input.feature.description?.trim() ? 'melhore a descrição atual' : 'gere uma descrição completa'} seguindo a estrutura especificada (Objetivo, Contexto, Critérios de Aceite).

Retorne APENAS o markdown da descrição, sem explicações adicionais.`;
}

// ============================================
// Use Case
// ============================================

/**
 * Improve Feature Description Use Case
 * 
 * Uses AI to generate or improve a Feature description
 * based on context from the Epic and project.
 * 
 * @example
 * ```typescript
 * const improved = await improveFeatureDescription(
 *   { feature: { title, description }, epic },
 *   { aiAdapter }
 * );
 * ```
 */
export async function improveFeatureDescription(
    input: ImproveFeatureDescriptionInput,
    deps: ImproveFeatureDescriptionDeps
): Promise<string> {
    const { aiAdapter } = deps;

    const userPrompt = buildUserPrompt(input);

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
