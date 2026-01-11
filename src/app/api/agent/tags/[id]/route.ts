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
import { docTagRepository } from '@/infra/adapters/prisma';

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
// DISABLED: Operações destrutivas desabilitadas por precaução

export async function DELETE() {
  return agentError('DISABLED', 'DELETE operations are disabled for safety', 403);
}
