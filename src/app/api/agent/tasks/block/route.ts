/**
 * Agent API - Bulk Block/Unblock Tasks
 * 
 * PATCH /api/agent/tasks/block - specific endpoint to block/unblock tasks
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentSuccess, agentError, handleAgentError } from '@/shared/http/agent-responses';
import { taskRepository, auditLogRepository, prisma } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

const agentMetadataSchema = z.object({
  changeReason: z.string().optional(),
  aiReasoning: z.string().optional(),
  relatedTaskIds: z.array(z.string().uuid()).optional(),
}).optional();

const blockTasksSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one task ID is required'),
  blocked: z.boolean(),
  _metadata: agentMetadataSchema,
});

export async function PATCH(request: NextRequest) {
  try {
    const { orgId, userId, agentName } = await extractAgentAuth();

    const body = await request.json();
    const parsed = blockTasksSchema.safeParse(body);

    if (!parsed.success) {
      return agentError('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { ids, blocked, _metadata: agentMetadata } = parsed.data;

    // Fetch existing tasks BEFORE update for audit trail
    const existingTasks = await prisma.task.findMany({
      where: {
        id: { in: ids },
        orgId,
      },
      select: {
        id: true,
        title: true,
        localId: true,
        blocked: true,
        project: { select: { key: true } },
      },
    });

    const count = await taskRepository.bulkUpdate(ids, orgId, { blocked });

    // Build base metadata for audit logs
    const baseMetadata = {
      source: 'agent' as const,
      agentName,
      bulkOperation: true,
      ...(agentMetadata && {
        changeReason: agentMetadata.changeReason,
        aiReasoning: agentMetadata.aiReasoning,
        relatedTaskIds: agentMetadata.relatedTaskIds,
      }),
    };

    // Create audit logs for each task that actually changed
    const auditPromises = existingTasks
      .filter(task => task.blocked !== blocked)
      .map(task => 
        auditLogRepository.log({
          orgId,
          userId,
          action: blocked ? 'task.blocked' : 'task.unblocked',
          targetType: 'task',
          targetId: task.id,
          metadata: {
            ...baseMetadata,
            taskTitle: task.title,
            localId: task.localId,
            projectKey: task.project?.key,
          }
        })
      );

    // Execute audit logs (best-effort, don't block success)
    if (auditPromises.length > 0) {
      await Promise.allSettled(auditPromises);
    }

    return agentSuccess({
      count,
      message: `${count} tasks ${blocked ? 'blocked' : 'unblocked'}`
    });
  } catch (error) {
    return handleAgentError(error);
  }
}
