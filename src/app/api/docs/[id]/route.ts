import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { projectDocRepository } from '@/infra/adapters/prisma';
import { z } from 'zod';

const updateDocSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(100000).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

/**
 * GET /api/docs/[id] - Get a single doc
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const doc = await projectDocRepository.findById(id, tenantId);
    if (!doc) {
      return jsonError('NOT_FOUND', 'Documento não encontrado', 404);
    }

    return jsonSuccess(doc);

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * PATCH /api/docs/[id] - Update a doc
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
    const parsed = updateDocSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const doc = await projectDocRepository.update(id, tenantId, parsed.data);
    return jsonSuccess(doc);

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * DELETE /api/docs/[id] - Delete a doc
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    await projectDocRepository.delete(id, tenantId);
    return new Response(null, { status: 204 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
