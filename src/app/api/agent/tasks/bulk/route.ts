/**
 * Agent API - Bulk Task Update
 * 
 * PATCH /api/agent/tasks/bulk - Update multiple tasks
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentSuccess, agentError, handleAgentError } from '@/shared/http/agent-responses';
import { taskRepository, auditLogRepository, prisma } from '@/infra/adapters/prisma';
import { AUDIT_ACTIONS } from '@/infra/adapters/prisma/audit-log.repository';

export const dynamic = 'force-dynamic';

const agentMetadataSchema = z.object({
  changeReason: z.string().optional(),
  aiReasoning: z.string().optional(),
  relatedTaskIds: z.array(z.string().uuid()).optional(),
}).optional();

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one task ID is required'),
  update: z.object({
    status: z.enum(['BACKLOG', 'TODO', 'DOING', 'REVIEW', 'DONE']).optional(),
    type: z.enum(['TASK', 'BUG']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    blocked: z.boolean().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field to update is required',
  }),
  // Agent-provided metadata (optional)
  _metadata: agentMetadataSchema,
});

export async function PATCH(request: NextRequest) {
  try {
    const { orgId, userId, agentName } = await extractAgentAuth();

    const body = await request.json();
    const parsed = bulkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return agentError('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { ids, update, _metadata: agentMetadata } = parsed.data;

    // Filter out undefined values to prevent Prisma errors
    const safeUpdate = Object.fromEntries(
      Object.entries(update).filter(([_, v]) => v !== undefined)
    );

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
        status: true,
        assigneeId: true,
        blocked: true,
        project: { select: { key: true } },
      },
    });

    // Perform bulk update
    const count = await taskRepository.bulkUpdate(ids, orgId, safeUpdate);

    // Build base metadata for all audit logs
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

    // Create audit logs for significant changes
    const auditPromises: Promise<any>[] = [];
    
    for (const task of existingTasks) {
      // Status changed
      if (safeUpdate.status && safeUpdate.status !== task.status) {
        auditPromises.push(
          auditLogRepository.log({
            orgId,
            userId,
            action: AUDIT_ACTIONS.TASK_STATUS_CHANGED,
            targetType: 'task',
            targetId: task.id,
            metadata: {
              ...baseMetadata,
              fromStatus: task.status,
              toStatus: safeUpdate.status,
              taskTitle: task.title,
              localId: task.localId,
              projectKey: task.project?.key,
            }
          })
        );
      }

      // Assignee changed
      if (safeUpdate.assigneeId !== undefined && safeUpdate.assigneeId !== task.assigneeId) {
        auditPromises.push(
          auditLogRepository.log({
            orgId,
            userId,
            action: AUDIT_ACTIONS.TASK_ASSIGNED,
            targetType: 'task',
            targetId: task.id,
            metadata: {
              ...baseMetadata,
              fromAssigneeId: task.assigneeId,
              toAssigneeId: safeUpdate.assigneeId,
              taskTitle: task.title,
              localId: task.localId,
              projectKey: task.project?.key,
            }
          })
        );
      }

      // Blocked status changed
      if (safeUpdate.blocked !== undefined && safeUpdate.blocked !== task.blocked) {
        auditPromises.push(
          auditLogRepository.log({
            orgId,
            userId,
            action: safeUpdate.blocked ? 'task.blocked' : 'task.unblocked',
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
      }
    }

    // Execute all audit logs in parallel (best-effort, don't block success)
    if (auditPromises.length > 0) {
      await Promise.allSettled(auditPromises);
    }

    return agentSuccess({ count, message: `${count} tasks updated` });
  } catch (error) {
    return handleAgentError(error);
  }
}
