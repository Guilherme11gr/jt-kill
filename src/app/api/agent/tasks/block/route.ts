/**
 * Agent API - Bulk Block/Unblock Tasks
 * 
 * PATCH /api/agent/tasks/block - specific endpoint to block/unblock tasks
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentSuccess, agentError, handleAgentError } from '@/shared/http/agent-responses';
import { taskRepository } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

const blockTasksSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one task ID is required'),
  blocked: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  try {
    const { orgId } = await extractAgentAuth();

    const body = await request.json();
    const parsed = blockTasksSchema.safeParse(body);

    if (!parsed.success) {
      return agentError('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { ids, blocked } = parsed.data;

    const count = await taskRepository.bulkUpdate(ids, orgId, { blocked });

    return agentSuccess({
      count,
      message: `${count} tasks ${blocked ? 'blocked' : 'unblocked'}`
    });
  } catch (error) {
    return handleAgentError(error);
  }
}
