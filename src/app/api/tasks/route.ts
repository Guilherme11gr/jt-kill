import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, extractUserId } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { taskRepository, featureRepository, auditLogRepository } from '@/infra/adapters/prisma';
import { AUDIT_ACTIONS } from '@/infra/adapters/prisma/audit-log.repository';
import { searchTasks } from '@/domain/use-cases/tasks/search-tasks';
import { createTask } from '@/domain/use-cases/tasks/create-task';
import { z } from 'zod';
import { createTaskSchema } from '@/shared/utils';

const searchTasksSchema = z.object({
  status: z.string().or(z.array(z.string())).optional(),
  type: z.string().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  module: z.string().optional(),
  projectId: z.string().uuid().optional(),
  featureId: z.string().uuid().optional(),
  epicId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  // Performance optimization: skip count query for Kanban view
  skipCount: z.coerce.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const { searchParams } = new URL(request.url);
    const filters = Object.fromEntries(searchParams.entries());

    const parsed = searchTasksSchema.safeParse(filters);
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Filtros inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const result = await searchTasks(tenantId, parsed.data, { taskRepository });
    return jsonSuccess(result, { cache: 'none' });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}


export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase); // tenantId = orgId
    const userId = await extractUserId(supabase);

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const task = await createTask({
      orgId: tenantId,
      createdBy: userId,
      ...parsed.data,
    }, { taskRepository, featureRepository });

    // Registra auditoria
    await auditLogRepository.log({
      orgId: tenantId,
      userId,
      action: AUDIT_ACTIONS.TASK_CREATED,
      targetType: 'task',
      targetId: task.id,
      metadata: {
        taskTitle: task.title,
        localId: task.localId,
        projectId: task.projectId
      }
    });

    return jsonSuccess(task, { status: 201 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
