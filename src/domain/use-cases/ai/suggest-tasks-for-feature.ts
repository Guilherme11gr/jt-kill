import type { AIAdapter } from '@/infra/adapters/ai';

// ============================================
// Types
// ============================================

export interface SuggestedTask {
    title: string;
    description: string;
    complexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SuggestTasksInput {
    feature: {
        title: string;
        description: string | null;
        status: string;
    };
    epic?: {
        title: string;
        description: string | null;
    } | null;
    projectDocs?: Array<{ title: string; content: string }>;
}

export interface SuggestTasksDeps {
    aiAdapter: AIAdapter;
}

// ============================================
// Prompt Templates
// ============================================

const SYSTEM_PROMPT = `Você é um Product Manager técnico especializado em decomposição de features em tasks acionáveis.

Seu papel é analisar uma Feature e gerar sugestões de Tasks filhas bem estruturadas.

Diretrizes:
- Gere entre 3 e 8 tasks relevantes
- Cada task deve ser acionável e específica
- Evite tasks muito genéricas como "Implementar feature"
- Considere aspectos técnicos, de UX e de qualidade
- Inclua tasks de setup/preparação quando necessário
- Considere testes e documentação quando relevante
- Escreva em português brasileiro
- Retorne APENAS o JSON, sem markdown code blocks

Formato de resposta (JSON válido):
{
  "tasks": [
    {
      "title": "Título claro e conciso",
      "description": "## Objetivo\\n\\nDescrição do que deve ser feito.\\n\\n## Critérios de Aceite\\n\\n- [ ] Critério 1\\n- [ ] Critério 2",
      "complexity": "LOW" | "MEDIUM" | "HIGH"
    }
  ]
}`;

function buildUserPrompt(input: SuggestTasksInput): string {
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

    return `${epicSection}${docsSection}## Feature a ser decomposta

**Título:** ${input.feature.title}
**Status:** ${input.feature.status}

**Descrição:**
${input.feature.description || '(sem descrição - sugira tasks baseado apenas no título)'}

---

Analise esta Feature e sugira Tasks filhas para implementá-la.
Considere todos os aspectos necessários: frontend, backend, testes, etc.

Retorne APENAS o JSON válido conforme o formato especificado.`;
}

// ============================================
// Use Case
// ============================================

/**
 * Suggest Tasks for Feature Use Case
 * 
 * Uses AI to analyze a Feature and generate suggested child Tasks.
 * Returns structured task suggestions for user review.
 * 
 * @example
 * ```typescript
 * const suggestions = await suggestTasksForFeature(
 *   { feature: { title, description, status }, epic },
 *   { aiAdapter }
 * );
 * ```
 */
export async function suggestTasksForFeature(
    input: SuggestTasksInput,
    deps: SuggestTasksDeps
): Promise<SuggestedTask[]> {
    const { aiAdapter } = deps;

    const userPrompt = buildUserPrompt(input);

    const result = await aiAdapter.chatCompletion({
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 3000, // Higher limit for multiple tasks
    });

    // Parse JSON response
    const content = result.content.trim();

    try {
        // Try to extract JSON if wrapped in code blocks
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[AI] No JSON found in response:', content);
            throw new Error('Formato de resposta inválido da IA');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
            throw new Error('Resposta não contém array de tasks');
        }

        // Validate and sanitize each task
        const tasks: SuggestedTask[] = parsed.tasks
            .filter((t: any) => t.title && typeof t.title === 'string')
            .map((t: any) => ({
                title: t.title.trim(),
                description: (t.description || '').trim(),
                complexity: ['LOW', 'MEDIUM', 'HIGH'].includes(t.complexity)
                    ? t.complexity
                    : 'MEDIUM',
            }));

        if (tasks.length === 0) {
            throw new Error('Nenhuma sugestão de task gerada');
        }

        return tasks;
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error('[AI] Failed to parse JSON:', content);
            throw new Error('Erro ao processar resposta da IA');
        }
        throw error;
    }
}
