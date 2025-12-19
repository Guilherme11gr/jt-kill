import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { taskRepository } from '@/infra/adapters/prisma';
import { searchTasks } from '@/domain/use-cases/tasks/search-tasks';
import { createTask } from '@/domain/use-cases/tasks/create-task';
import { z } from 'zod';

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
    return jsonSuccess(result, { cache: 'short' });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

const createTaskSchema = z.object({
  featureId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  type: z.enum(['TASK', 'BUG']).default('TASK'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  points: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(5),
    z.literal(8),
    z.literal(13),
    z.literal(21),
  ]).optional().nullable(),
  module: z.string().max(50).optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
});

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
      points: undefined,
    }, { taskRepository });

    return jsonSuccess(task, { status: 201 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
