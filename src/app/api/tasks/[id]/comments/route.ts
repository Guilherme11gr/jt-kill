import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, extractUserId } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { commentRepository, taskRepository } from '@/infra/adapters/prisma';
import { z } from 'zod';

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comentário não pode estar vazio').max(5000),
});

/**
 * GET /api/tasks/[id]/comments - List comments for a task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // Verify task exists and belongs to org
    const task = await taskRepository.findById(taskId, tenantId);
    if (!task) {
      return jsonError('NOT_FOUND', 'Task não encontrada', 404);
    }

    const comments = await commentRepository.findByTaskId(taskId, tenantId);
    return jsonSuccess(comments);

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * POST /api/tasks/[id]/comments - Add a comment to a task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);
    const userId = await extractUserId(supabase);

    // Verify task exists and belongs to org
    const task = await taskRepository.findById(taskId, tenantId);
    if (!task) {
      return jsonError('NOT_FOUND', 'Task não encontrada', 404);
    }

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const comment = await commentRepository.create({
      orgId: tenantId,
      taskId,
      userId,
      content: parsed.data.content,
    });

    return jsonSuccess(comment, { status: 201 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
