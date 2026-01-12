/**
 * Agent API - Task Comments
 *
 * GET /api/agent/tasks/:id/comments - List comments for a task
 * POST /api/agent/tasks/:id/comments - Add a comment to a task
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentSuccess, agentError, agentList, handleAgentError } from '@/shared/http/agent-responses';
import { taskRepository, commentRepository } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

// ============ GET - List Comments ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await extractAgentAuth();
    const { id: taskId } = await params;

    if (!z.string().uuid().safeParse(taskId).success) {
      return agentError('VALIDATION_ERROR', 'Invalid task ID', 400);
    }

    // Verify task exists and belongs to org
    const task = await taskRepository.findById(taskId, orgId);
    if (!task) {
      return agentError('NOT_FOUND', 'Task not found', 404);
    }

    // List comments ordered by creation date
    const comments = await commentRepository.findByTaskId(taskId, orgId);

    return agentList(comments, comments.length);
  } catch (error) {
    return handleAgentError(error);
  }
}

// ============ POST - Create Comment ============

const createCommentSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  userId: z.string().uuid().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await extractAgentAuth();
    const { id: taskId } = await params;

    if (!z.string().uuid().safeParse(taskId).success) {
      return agentError('VALIDATION_ERROR', 'Invalid task ID', 400);
    }

    // Verify task exists
    const task = await taskRepository.findById(taskId, orgId);
    if (!task) {
      return agentError('NOT_FOUND', 'Task not found', 404);
    }

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      return agentError('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { content, userId: bodyUserId } = parsed.data;

    // Determine the author (User ID)
    // 1. Provided in the body
    // 2. AGENT_USER_ID env var
    const userId = bodyUserId || process.env.AGENT_USER_ID;

    if (!userId) {
      return agentError(
        'CONFIGURATION_ERROR',
        'User ID is required. Provide "userId" in body or configure AGENT_USER_ID.',
        400
      );
    }

    // Create the comment
    // Only 'content' is required by schema, but repository needs orgId, taskId, userId
    const comment = await commentRepository.create({
      taskId,
      userId,
      content,
      orgId,
    });

    return agentSuccess(comment, 201);
  } catch (error: any) {
    // Check for foreign key constraint violation (user not found)
    if (error.code === 'P2003') { // Prisma error code for FK violation
      return agentError('VALIDATION_ERROR', 'Referenced user not found', 400);
    }
    return handleAgentError(error);
  }
}
