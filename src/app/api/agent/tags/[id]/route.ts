/**
 * Agent API - Tag by ID
 * 
 * GET /api/agent/tags/:id - Get tag by ID
 * DELETE /api/agent/tags/:id - Delete tag
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentSuccess, agentError, handleAgentError } from '@/shared/http/agent-responses';
import { docTagRepository, auditLogRepository } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

// ============ GET - Get Tag by ID ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await extractAgentAuth();
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return agentError('VALIDATION_ERROR', 'Invalid tag ID', 400);
    }

    const tag = await docTagRepository.findById(id, orgId);
    if (!tag) {
      return agentError('NOT_FOUND', 'Tag not found', 404);
    }

    return agentSuccess(tag);
  } catch (error) {
    return handleAgentError(error);
  }
}

// ============ DELETE - Delete Tag ============

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId, agentName, keyPrefix, authMethod, keyId } = await extractAgentAuth();
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return agentError('VALIDATION_ERROR', 'Invalid tag ID', 400);
    }

    // Verify tag exists
    const existing = await docTagRepository.findById(id, orgId);
    if (!existing) {
      return agentError('NOT_FOUND', 'Tag not found', 404);
    }

    await docTagRepository.delete(id, orgId);

    await auditLogRepository.log({
      orgId,
      userId,
      action: 'tag.deleted',
      targetType: 'project_tag',
      targetId: id,
      actorType: 'agent',
      clientId: keyId,
      metadata: {
        source: 'agent',
        agentName,
        keyPrefix,
        authMethod,
        name: existing.name,
        projectId: existing.projectId,
      },
    }).catch(() => {});

    return agentSuccess({ deleted: true, id, name: existing.name });
  } catch (error) {
    return handleAgentError(error);
  }
}
