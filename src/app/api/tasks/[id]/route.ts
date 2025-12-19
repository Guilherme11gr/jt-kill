import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { taskRepository } from '@/infra/adapters/prisma';
import { updateTask } from '@/domain/use-cases/tasks/update-task';
import { deleteTask } from '@/domain/use-cases/tasks/delete-task';
import type { StoryPoints } from '@/shared/types';
import { z } from 'zod';

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullable().optional(),
  status: z.enum(['BACKLOG', 'TODO', 'DOING', 'REVIEW', 'QA_READY', 'DONE']).optional(),
  type: z.enum(['TASK', 'BUG']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  points: z.number().int().refine((v) => [1, 2, 3, 5, 8, 13, 21].includes(v)).nullable().optional(),
  module: z.string().max(50).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

/**
 * GET /api/tasks/[id] - Get task with relations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const task = await taskRepository.findByIdWithRelations(id, tenantId);
    if (!task) {
      return jsonError('NOT_FOUND', 'Task não encontrada', 404);
    }
    return jsonSuccess(task);

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

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

    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const task = await updateTask(id, tenantId, {
      ...parsed.data,
      points: parsed.data.points as StoryPoints | null | undefined,
    }, { taskRepository });
    return jsonSuccess(task);

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status, body.error.details as Record<string, unknown>);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    await deleteTask(id, tenantId, { taskRepository });
    return new Response(null, { status: 204 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
