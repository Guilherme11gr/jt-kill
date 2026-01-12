/**
 * Agent API - Epic Full (Aggregated Data)
 * 
 * GET /api/agent/epics/:id/full - Returns epic with ALL nested data in single call
 * 
 * Benefits:
 * - 75% latency reduction (1 call vs 4 sequential calls)
 * - Pre-calculated stats (no client-side counting)
 * - Complete context for AI agents
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentSuccess, agentError, handleAgentError } from '@/shared/http/agent-responses';
import { prisma } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

// Types for aggregated response
interface EpicFullStats {
  totalFeatures: number;
  totalTasks: number;
  featuresByStatus: Record<string, number>;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  blockedTasks: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await extractAgentAuth();
    const { id: epicId } = await params;

    // Validate UUID
    if (!z.string().uuid().safeParse(epicId).success) {
      return agentError('VALIDATION_ERROR', 'Invalid epic ID', 400);
    }

    // 1. Fetch epic with project (single query)
    const epic = await prisma.epic.findFirst({
      where: { id: epicId, orgId },
      include: {
        project: {
          select: { id: true, key: true, name: true }
        }
      }
    });

    if (!epic) {
      return agentError('NOT_FOUND', 'Epic not found', 404);
    }

    // 2. Fetch features with tasks and assignees (optimized single query with JOINs)
    const features = await prisma.feature.findMany({
      where: { epicId, orgId },
      orderBy: { createdAt: 'asc' },
      include: {
        tasks: {
          select: {
            id: true,
            localId: true,
            title: true,
            description: true,
            status: true,
            type: true,
            priority: true,
            blocked: true,
            assigneeId: true,
            createdAt: true,
            assignee: {
              select: {
                id: true,
                user_profiles: {
                  select: {
                    displayName: true,
                    avatarUrl: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // 3. Calculate aggregated stats
    const stats = calculateStats(features);

    // 4. Return complete aggregated response
    return agentSuccess({
      epic: {
        id: epic.id,
        title: epic.title,
        description: epic.description,
        status: epic.status,
        projectId: epic.projectId,
        createdAt: epic.createdAt,
        updatedAt: epic.updatedAt,
        project: epic.project
      },
      features: features.map(f => ({
        id: f.id,
        title: f.title,
        description: f.description,
        status: f.status,
        health: f.health,
        createdAt: f.createdAt,
        tasks: f.tasks.map(t => ({
          id: t.id,
          readableId: `${epic.project.key}-${t.localId}`,
          title: t.title,
          description: t.description,
          status: t.status,
          type: t.type,
          priority: t.priority,
          blocked: t.blocked,
          assigneeId: t.assigneeId,
          createdAt: t.createdAt,
          assignee: t.assignee?.user_profiles ? {
            id: t.assignee.id,
            displayName: t.assignee.user_profiles.displayName,
            avatarUrl: t.assignee.user_profiles.avatarUrl
          } : null
        }))
      })),
      stats
    });

  } catch (error) {
    return handleAgentError(error);
  }
}

/**
 * Calculate aggregated statistics from features and tasks
 */
function calculateStats(features: Array<{ 
  status: string; 
  tasks: Array<{ status: string; priority: string; blocked: boolean }> 
}>): EpicFullStats {
  const stats: EpicFullStats = {
    totalFeatures: features.length,
    totalTasks: 0,
    featuresByStatus: {},
    tasksByStatus: {},
    tasksByPriority: {},
    blockedTasks: 0
  };

  for (const feature of features) {
    // Count features by status
    stats.featuresByStatus[feature.status] = 
      (stats.featuresByStatus[feature.status] || 0) + 1;

    // Count tasks
    for (const task of feature.tasks) {
      stats.totalTasks++;
      
      stats.tasksByStatus[task.status] = 
        (stats.tasksByStatus[task.status] || 0) + 1;
      
      stats.tasksByPriority[task.priority] = 
        (stats.tasksByPriority[task.priority] || 0) + 1;
      
      if (task.blocked) {
        stats.blockedTasks++;
      }
    }
  }

  return stats;
}
