/**
 * Agent API - Bulk Task Update
 * 
 * PATCH /api/agent/tasks/bulk - Update multiple tasks
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentSuccess, agentError, handleAgentError } from '@/shared/http/agent-responses';
import { taskRepository } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

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
});

export async function PATCH(request: NextRequest) {
  try {
    const { orgId } = await extractAgentAuth();

    const body = await request.json();
    const parsed = bulkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return agentError('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { ids, update } = parsed.data;

    // Filter out undefined values to prevent Prisma errors
    const safeUpdate = Object.fromEntries(
      Object.entries(update).filter(([_, v]) => v !== undefined)
    );

    const count = await taskRepository.bulkUpdate(ids, orgId, safeUpdate);

    return agentSuccess({ count, message: `${count} tasks updated` });
  } catch (error) {
    return handleAgentError(error);
  }
}
