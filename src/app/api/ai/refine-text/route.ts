import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { aiAdapter } from '@/infra/adapters/ai';
import { refineText } from '@/domain/use-cases/ai/refine-text';
import { z } from 'zod';

const refineTextSchema = z.object({
    text: z.string().trim().min(1, 'Texto não pode estar vazio').max(10000, 'Texto muito longo (máx: 10000 caracteres)'),
    context: z.string().optional(),
});

/**
 * POST /api/ai/refine-text
 * 
 * Uses AI to refine existing text (grammar, clarity, markdown).
 * Does NOT add new information - only improves writing quality.
 * 
 * ## Request Body
 * ```json
 * {
 *   "text": "texto a refinar",
 *   "context": "descrição de task" // opcional
 * }
 * ```
 * 
 * ## Response
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "refinedText": "Texto refinado...",
 *     "originalLength": 50,
 *     "refinedLength": 120
 *   }
 * }
 * ```
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Auth
        const supabase = await createClient();
        await extractAuthenticatedTenant(supabase); // Just check auth, don't need tenantId

        // 2. Validate input
        const body = await request.json();
        const parsed = refineTextSchema.safeParse(body);

        if (!parsed.success) {
            return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
                errors: parsed.error.flatten().fieldErrors,
            } as Record<string, unknown>);
        }

        const { text, context } = parsed.data;

        // 3. Refine text using AI
        const refinedText = await refineText(
            { text, context },
            { aiAdapter }
        );

        // 4. Return refined text with metrics
        return jsonSuccess({
            refinedText,
            originalLength: text.length,
            refinedLength: refinedText.length,
        });

    } catch (error) {
        console.error('[AI] Refine text error:', error);
        const { status, body } = handleError(error);
        return jsonError(body.error.code, body.error.message, status);
    }
}
