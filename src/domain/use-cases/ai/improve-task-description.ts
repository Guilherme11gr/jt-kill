import type { TaskWithReadableId } from '@/shared/types';
import type { AIAdapter } from '@/infra/adapters/ai';
import { buildTaskDescriptionContext } from './context';
import { buildImproveDescriptionPrompt } from './prompts';

export interface ImproveTaskDescriptionInput {
    task: TaskWithReadableId;
    featureDescription?: string | null;
}

export interface ImproveTaskDescriptionDeps {
    aiAdapter: AIAdapter;
}

/**
 * Improve Task Description Use Case
 * 
 * Uses AI to generate an improved task description
 * based on the task context and parent feature.
 * 
 * @example
 * ```typescript
 * const improved = await improveTaskDescription(
 *   { task, featureDescription: feature.description },
 *   { aiAdapter }
 * );
 * ```
 */
export async function improveTaskDescription(
    input: ImproveTaskDescriptionInput,
    deps: ImproveTaskDescriptionDeps
): Promise<string> {
    const { aiAdapter } = deps;

    // 1. Build context from task data
    const context = buildTaskDescriptionContext(
        input.task,
        input.featureDescription
    );

    // 2. Generate prompt from context
    const { systemPrompt, userPrompt } = buildImproveDescriptionPrompt(context);

    // 3. Call AI with structured prompt
    const result = await aiAdapter.chatCompletion({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 1000,
    });

    return result.content.trim();
}
