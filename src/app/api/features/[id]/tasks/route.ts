import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { taskRepository } from '@/infra/adapters/prisma';
import { getTasksByFeature } from '@/domain/use-cases/tasks/get-tasks-by-feature';
import { createTask } from '@/domain/use-cases/tasks/create-task';
import type { StoryPoints } from '@/shared/types';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).nullable().optional(),
  type: z.enum(['TASK', 'BUG']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  points: z.number().int().refine((v) => [1, 2, 3, 5, 8, 13, 21].includes(v), {
    message: 'Points devem ser Fibonacci (1, 2, 3, 5, 8, 13, 21)',
  }).nullable().optional(),
  module: z.string().max(50).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: featureId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const tasks = await getTasksByFeature(featureId, tenantId, { taskRepository });
    return jsonSuccess(tasks, { cache: 'short' });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: featureId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);
    
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const task = await createTask({ 
      orgId: tenantId, 
      featureId, 
      ...parsed.data,
      points: parsed.data.points as StoryPoints | null | undefined,
    }, { taskRepository });
    return jsonSuccess(task, { status: 201 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status, body.error.details as Record<string, unknown>);
  }
}
