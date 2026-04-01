import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { epicRepository, featureRepository } from '@/infra/adapters/prisma';

// Disable Next.js cache
export const dynamic = 'force-dynamic';

/**
 * GET /api/epics/:id/full - Epic with ALL nested data in single call
 *
 * Returns epic + features + tasks + stats in 2 queries (no N+1).
 * Used by the agent chat's get_epic_full tool.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: epicId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // 1. Fetch epic with project (1 query)
    const epic = await epicRepository.findByIdWithProject(epicId, tenantId);
    if (!epic) {
      return jsonError('NOT_FOUND', 'Épico não encontrado', 404);
    }

    // 2. Fetch features with tasks (1 query — findManyInEpicWithTasks)
    const featuresWithTasks = await featureRepository.findManyInEpicWithTasks(epicId, tenantId);

    // 3. Calculate stats in-memory
    const stats = {
      totalFeatures: featuresWithTasks.length,
      totalTasks: 0,
      featuresByStatus: {} as Record<string, number>,
      tasksByStatus: {} as Record<string, number>,
      tasksByPriority: {} as Record<string, number>,
      blockedTasks: 0,
    };

    for (const feature of featuresWithTasks) {
      stats.featuresByStatus[feature.status] = (stats.featuresByStatus[feature.status] || 0) + 1;

      for (const task of feature.tasks) {
        stats.totalTasks += 1;
        stats.tasksByStatus[task.status] = (stats.tasksByStatus[task.status] || 0) + 1;
        stats.tasksByPriority[task.priority] = (stats.tasksByPriority[task.priority] || 0) + 1;
      }
    }

    return jsonSuccess({
      epic: {
        id: epic.id,
        title: epic.title,
        description: epic.description,
        status: epic.status,
        projectId: epic.projectId,
        project: epic.project,
        createdAt: epic.createdAt,
        updatedAt: epic.updatedAt,
      },
      features: featuresWithTasks.map(f => ({
        id: f.id,
        title: f.title,
        status: f.status,
        tasks: f.tasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          type: t.type,
          priority: t.priority,
          updatedAt: t.updatedAt,
        })),
      })),
      stats,
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
