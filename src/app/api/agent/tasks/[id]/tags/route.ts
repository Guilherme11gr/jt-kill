/**
 * Agent API - Task Tags
 * 
 * GET /api/agent/tasks/:id/tags - Get tags for a task
 * PUT /api/agent/tasks/:id/tags - Set tags for a task (replaces all)
 * POST /api/agent/tasks/:id/tags - Add tags to a task (append)
 * DELETE /api/agent/tasks/:id/tags/:tagId - Remove a tag from a task
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentSuccess, agentError, handleAgentError } from '@/shared/http/agent-responses';
import { taskTagRepository, taskRepository, auditLogRepository } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

// ============ GET - Get Tags for a Task ============

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

    // Verify task exists
    const task = await taskRepository.findById(id, orgId);
    if (!task) {
      return agentError('NOT_FOUND', 'Task not found', 404);
    }

    const tags = await taskTagRepository.getTagsForTask(id);
    return agentSuccess(tags);
  } catch (error) {
    return handleAgentError(error);
  }
}

// ============ PUT - Set Tags (replace all) ============

const setTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()).default([]),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId, agentName, keyPrefix, authMethod, keyId } = await extractAgentAuth();
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return agentError('VALIDATION_ERROR', 'Invalid task ID', 400);
    }

    const body = await request.json();
    const parsed = setTagsSchema.safeParse(body);

    if (!parsed.success) {
      return agentError('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    await taskTagRepository.assignToTask(id, parsed.data.tagIds, orgId);

    await auditLogRepository.log({
      orgId,
      userId,
      action: 'task.tags.set',
      targetType: 'task',
      targetId: id,
      actorType: 'agent',
      clientId: keyId,
      metadata: {
        source: 'agent',
        agentName,
        keyPrefix,
        authMethod,
        tagIds: parsed.data.tagIds,
      },
    }).catch(() => {});

    const tags = await taskTagRepository.getTagsForTask(id);
    return agentSuccess(tags);
  } catch (error) {
    return handleAgentError(error);
  }
}

// ============ POST - Add Tags (append) ============

const addTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()).min(1, 'At least one tag ID is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId, agentName, keyPrefix, authMethod, keyId } = await extractAgentAuth();
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return agentError('VALIDATION_ERROR', 'Invalid task ID', 400);
    }

    const body = await request.json();
    const parsed = addTagsSchema.safeParse(body);

    if (!parsed.success) {
      return agentError('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    // Get current tags and merge
    const currentTags = await taskTagRepository.getTagsForTask(id);
    const currentTagIds = currentTags.map(t => t.id);
    const mergedTagIds = Array.from(new Set([...currentTagIds, ...parsed.data.tagIds]));

    await taskTagRepository.assignToTask(id, mergedTagIds, orgId);

    await auditLogRepository.log({
      orgId,
      userId,
      action: 'task.tags.added',
      targetType: 'task',
      targetId: id,
      actorType: 'agent',
      clientId: keyId,
      metadata: {
        source: 'agent',
        agentName,
        keyPrefix,
        authMethod,
        addedTagIds: parsed.data.tagIds,
        totalTagIds: mergedTagIds,
      },
    }).catch(() => {});

    const tags = await taskTagRepository.getTagsForTask(id);
    return agentSuccess(tags);
  } catch (error) {
    return handleAgentError(error);
  }
}
