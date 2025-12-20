import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { projectDocRepository, projectRepository } from '@/infra/adapters/prisma';
import { z } from 'zod';

const createDocSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  content: z.string().max(100000), // 100KB max
});

/**
 * GET /api/projects/[id]/docs - List docs for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // Verify project exists and belongs to org
    const project = await projectRepository.findById(projectId, tenantId);
    if (!project) {
      return jsonError('NOT_FOUND', 'Projeto não encontrado', 404);
    }

    const docs = await projectDocRepository.findByProjectId(projectId, tenantId);
    return jsonSuccess(docs);

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * POST /api/projects/[id]/docs - Create a new doc
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // Verify project exists and belongs to org
    const project = await projectRepository.findById(projectId, tenantId);
    if (!project) {
      return jsonError('NOT_FOUND', 'Projeto não encontrado', 404);
    }

    const body = await request.json();
    const parsed = createDocSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const doc = await projectDocRepository.create({
      orgId: tenantId,
      projectId,
      title: parsed.data.title,
      content: parsed.data.content,
    });

    return jsonSuccess(doc, { status: 201 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
