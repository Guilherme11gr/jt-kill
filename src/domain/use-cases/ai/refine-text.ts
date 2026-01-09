import type { AIAdapter } from '@/infra/adapters/ai';

export interface RefineTextInput {
    text: string;
    context?: string; // Contexto opcional (ex: "descrição de task", "descrição de feature")
}

export interface RefineTextDeps {
    aiAdapter: AIAdapter;
}

/**
 * Refine Text Use Case
 * 
 * Uses AI to improve the writing quality of existing text.
 * Focus: grammar, clarity, markdown formatting, and readability.
 * Does NOT add new information or context - only refines what exists.
 * 
 * @example
 * ```typescript
 * const refined = await refineText(
 *   { text: 'Implementar login', context: 'descrição de task' },
 *   { aiAdapter }
 * );
 * ```
 */
export async function refineText(
    input: RefineTextInput,
    deps: RefineTextDeps
): Promise<string> {
    const { aiAdapter } = deps;
    const { text, context } = input;

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(text, context);

    // Calculate maxTokens dynamically based on input size to optimize costs
    // Estimate: output ≈ input length/2 + 300 for formatting, capped at 2000
    const estimatedTokens = Math.min(Math.ceil(text.length / 2) + 300, 2000);

    const result = await aiAdapter.chatCompletion({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more conservative refinement
        maxTokens: estimatedTokens,
    });

    return result.content.trim();
}

function buildSystemPrompt(): string {
    return `Você é um revisor de texto especializado em gestão de projetos de software.
Seu papel é refinar e melhorar a qualidade da escrita, sem adicionar informações novas.

Diretrizes:
- Corrija erros de gramática e ortografia
- Melhore a clareza e objetividade
- Formate em Markdown quando apropriado (listas, negrito, código)
- Mantenha o significado e intenção originais
- Escreva em português brasileiro
- Não adicione informações que não estavam no texto original
- Não adicione emojis
- Seja conservador: se o texto já está bom, mude pouco

Formatação Markdown:
- Use \`código\` para nomes de variáveis, funções, arquivos
- Use **negrito** para ênfase importante
- Use listas com \`-\` quando houver múltiplos itens
- Use \`##\` para seções se o texto for longo

**Retorne APENAS o texto refinado, sem explicações ou prefixos.**`;
}

function buildUserPrompt(text: string, context?: string): string {
    const contextLine = context ? `**Contexto:** ${context}\n\n` : '';

    return `${contextLine}**Texto a refinar:**

${text}

---

Refine este texto melhorando gramática, clareza e formatação markdown.`;
}
