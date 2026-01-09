/**
 * Task Tags Assignment API
 * GET /api/tasks/[id]/tags - Get tags assigned to a task
 * PUT /api/tasks/[id]/tags - Set tags for a task (replace all)
 */
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { taskTagRepository } from '@/infra/adapters/prisma';
import { z } from 'zod';

const assignTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/tasks/[id]/tags
 * Get all tags assigned to a task
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: taskId } = await params;
    const tags = await taskTagRepository.getTagsForTask(taskId);
    return jsonSuccess(tags);
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * PUT /api/tasks/[id]/tags
 * Replace all tags for a task
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const body = await request.json();
    const { tagIds } = assignTagsSchema.parse(body);

    await taskTagRepository.assignToTask(taskId, tagIds, tenantId);
    const tags = await taskTagRepository.getTagsForTask(taskId);
    return jsonSuccess(tags);
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

