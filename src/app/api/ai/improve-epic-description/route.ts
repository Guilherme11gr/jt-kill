import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { epicRepository, projectRepository, projectDocRepository } from '@/infra/adapters/prisma';
import { aiAdapter } from '@/infra/adapters/ai';
import { improveEpicDescription } from '@/domain/use-cases/ai';
import { AI_SERVER_TIMEOUT_MS } from '@/config/ai.config';
import { z } from 'zod';

const improveEpicDescriptionSchema = z.object({
    epicId: z.string().uuid('ID do epic inválido').optional(),
    title: z.string().min(1, 'Título é obrigatório'),
    description: z.string().optional(),
    projectId: z.string().uuid('ID do projeto inválido'),
    includeProjectDocs: z.boolean().optional().default(true),
});

/**
 * Creates a timeout promise that rejects after specified milliseconds
 */
function createTimeoutPromise<T>(ms: number): Promise<T> {
    return new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`AI request timeout after ${ms}ms`)), ms)
    );
}

/**
 * POST /api/ai/improve-epic-description
 * 
 * Uses AI to generate or improve an Epic description.
 * Can be used with existing epic (epicId) or inline data (title + projectId).
 * 
 * Includes server-side timeout to prevent hanging requests.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { tenantId } = await extractAuthenticatedTenant(supabase);

        const body = await request.json();
        const parsed = improveEpicDescriptionSchema.safeParse(body);

        if (!parsed.success) {
            return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
                errors: parsed.error.flatten().fieldErrors,
            } as Record<string, unknown>);
        }

        const { epicId, title, description, projectId, includeProjectDocs } = parsed.data;

        let epicData = { title, description: description || null };
        let projectData: { name: string; description: string | null } | null = null;

        // If epicId provided, fetch epic data
        if (epicId) {
            const epic = await epicRepository.findById(epicId, tenantId);
            if (!epic) {
                return jsonError('NOT_FOUND', 'Epic não encontrada', 404);
            }
            epicData = { title: epic.title, description: epic.description };
        }

        // Fetch project data for context
        const project = await projectRepository.findById(projectId, tenantId);
        if (!project) {
            return jsonError('NOT_FOUND', 'Projeto não encontrado', 404);
        }
        projectData = { name: project.name, description: project.description };

        // Fetch project docs if requested
        let projectDocs: Array<{ title: string; content: string }> | undefined;
        if (includeProjectDocs) {
            projectDocs = await projectDocRepository.findForAIContext(projectId, tenantId);
        }

        // Generate improved description using AI with server-side timeout
        const improvedDescription = await Promise.race([
            improveEpicDescription(
                {
                    epic: epicData,
                    project: projectData,
                    projectDocs,
                },
                { aiAdapter }
            ),
            createTimeoutPromise<string>(AI_SERVER_TIMEOUT_MS),
        ]);

        return jsonSuccess({
            description: improvedDescription,
            hadPreviousDescription: !!epicData.description,
            usedProjectContext: !!projectData,
            usedDocs: (projectDocs?.length ?? 0) > 0,
        });
    } catch (error) {
        console.error('[API] improve-epic-description error:', error);
        
        // Handle timeout specifically
        if (error instanceof Error && error.message.includes('timeout')) {
            return jsonError('TIMEOUT', 'A requisição de IA excedeu o tempo limite', 504);
        }
        
        if (error instanceof Error) {
            return jsonError('AI_ERROR', error.message, 500);
        }
        
        return jsonError('UNKNOWN_ERROR', 'Erro desconhecido ao gerar descrição', 500);
    }
}
