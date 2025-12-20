import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { projectRepository, epicRepository, featureRepository } from '@/infra/adapters/prisma';
import { createProject } from '@/domain/use-cases/projects/create-project';
import { getProjects } from '@/domain/use-cases/projects/get-projects';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres'),
  key: z.string().min(2).max(10).regex(/^[A-Z0-9]+$/i, 'Apenas letras e números'),
  description: z.string().max(1000).nullable().optional(),
  modules: z
    .array(
      z.string().trim().min(1, 'Módulo não pode ser vazio').max(50)
    )
    .max(20)
    .optional(),
});

/**
 * POST /api/projects
 * Create new project
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // 2. Parse & validate body
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    // 3. Call use case (now also creates Sustentation structure)
    const project = await createProject(
      {
        orgId: tenantId,
        ...parsed.data,
      },
      { projectRepository, epicRepository, featureRepository }
    );

    // 4. Return created project
    return jsonSuccess(project, { status: 201 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status, body.error.details as Record<string, unknown>);
  }
}

/**
 * GET /api/projects
 * List all projects in organization
 */
export async function GET() {
  try {
    // 1. Auth
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // 2. Call use case
    const projects = await getProjects(tenantId, { projectRepository });

    // 3. Return with short cache (1 min)
    return jsonSuccess(projects, { cache: 'short' });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
