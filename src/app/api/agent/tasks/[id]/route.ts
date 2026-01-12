/**
 * Agent API - Task by ID
 * 
 * GET /api/agent/tasks/:id - Get task by ID
 * PATCH /api/agent/tasks/:id - Update task
 * DELETE /api/agent/tasks/:id - Delete task
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentSuccess, agentError, handleAgentError } from '@/shared/http/agent-responses';
import { taskRepository, auditLogRepository } from '@/infra/adapters/prisma';
import { updateTask } from '@/domain/use-cases/tasks/update-task';

export const dynamic = 'force-dynamic';

// ============ GET - Get Task by ID ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await extractAgentAuth();
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return agentError('VALIDATION_ERROR', 'Invalid task ID', 400);
    }

    const task = await taskRepository.findByIdWithRelations(id, orgId);
    if (!task) {
      return agentError('NOT_FOUND', 'Task not found', 404);
    }

    return agentSuccess(task);
  } catch (error) {
    return handleAgentError(error);
  }
}

// ============ PATCH - Update Task ============

const agentMetadataSchema = z.object({
  changeReason: z.string().optional(),
  aiReasoning: z.string().optional(),
  relatedTaskIds: z.array(z.string().uuid()).optional(),
}).optional();

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(['TASK', 'BUG']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['BACKLOG', 'TODO', 'DOING', 'REVIEW', 'DONE']).optional(),
  blocked: z.boolean().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  // Agent-provided metadata (optional)
  _metadata: agentMetadataSchema,
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId, agentName } = await extractAgentAuth();
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return agentError('VALIDATION_ERROR', 'Invalid task ID', 400);
    }

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return agentError('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    // Extract metadata before filtering
    const agentMetadata = parsed.data._metadata;

    // Filter out undefined values and _metadata
    const updateData = Object.fromEntries(
      Object.entries(parsed.data).filter(([k, v]) => k !== '_metadata' && v !== undefined)
    );

    if (Object.keys(updateData).length === 0) {
      return agentError('VALIDATION_ERROR', 'No fields to update', 400);
    }

    // Use updateTask use case with agent context for rich audit logs
    const updated = await updateTask(id, orgId, userId, updateData, { 
      taskRepository,
      auditLogRepository
    }, {
      source: 'agent',
      agentName,
      metadata: agentMetadata,
    });

    return agentSuccess(updated);
  } catch (error) {
    return handleAgentError(error);
  }
}

// ============ DELETE - Delete Task ============
// DISABLED: Operações destrutivas desabilitadas por precaução

export async function DELETE() {
  return agentError('DISABLED', 'DELETE operations are disabled for safety', 403);
}
