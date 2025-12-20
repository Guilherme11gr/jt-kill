import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, extractUserId } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError, ForbiddenError } from '@/shared/errors';
import { commentRepository } from '@/infra/adapters/prisma';
import { z } from 'zod';

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

/**
 * PATCH /api/comments/[id] - Update a comment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);
    const userId = await extractUserId(supabase);

    // Find comment
    const comment = await commentRepository.findById(id, tenantId);
    if (!comment) {
      return jsonError('NOT_FOUND', 'Comentário não encontrado', 404);
    }

    // Only the author can edit
    if (comment.userId !== userId) {
      throw new ForbiddenError('Só o autor pode editar este comentário');
    }

    const body = await request.json();
    const parsed = updateCommentSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const updated = await commentRepository.update(id, tenantId, parsed.data.content);
    return jsonSuccess(updated);

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * DELETE /api/comments/[id] - Delete a comment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);
    const userId = await extractUserId(supabase);

    // Find comment
    const comment = await commentRepository.findById(id, tenantId);
    if (!comment) {
      return jsonError('NOT_FOUND', 'Comentário não encontrado', 404);
    }

    // Only the author can delete
    if (comment.userId !== userId) {
      throw new ForbiddenError('Só o autor pode excluir este comentário');
    }

    await commentRepository.delete(id, tenantId);
    return new Response(null, { status: 204 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
