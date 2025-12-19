import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { projectRepository } from '@/infra/adapters/prisma';
import { getProjectById } from '@/domain/use-cases/projects/get-project-by-id';
import { updateProject } from '@/domain/use-cases/projects/update-project';
import { deleteProject } from '@/domain/use-cases/projects/delete-project';
import { z } from 'zod';

const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  // ⚠️ key é IMUTÁVEL - não pode ser alterado após criação
  description: z.string().max(1000).nullable().optional(),
  modules: z
    .array(
      z.string().trim().min(1, 'Módulo não pode ser vazio').max(50)
    )
    .max(20)
    .optional(),
});

/**
 * GET /api/projects/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const project = await getProjectById(id, tenantId, { projectRepository });
    return jsonSuccess(project, { cache: 'short' });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * PATCH /api/projects/:id
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const body = await request.json();
    
    if (!body || Object.keys(body).length === 0) {
      return jsonError('VALIDATION_ERROR', 'Nenhum campo fornecido para atualizar', 400);
    }
    
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const project = await updateProject(id, tenantId, parsed.data, { projectRepository });
    return jsonSuccess(project);

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status, body.error.details as Record<string, unknown>);
  }
}

/**
 * DELETE /api/projects/:id
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    await deleteProject(id, tenantId, { projectRepository });
    return new Response(null, { status: 204 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
