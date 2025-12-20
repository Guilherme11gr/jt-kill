import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { taskRepository, featureRepository } from '@/infra/adapters/prisma';
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

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const task = await createTask({
      orgId: tenantId,
      ...parsed.data,
    }, { taskRepository, featureRepository });

    return jsonSuccess(task, { status: 201 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
