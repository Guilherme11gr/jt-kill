/**
 * Agent API - Epic by ID
 * 
 * GET /api/agent/epics/:id - Get epic by ID with features (read-only)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentSuccess, agentError, handleAgentError } from '@/shared/http/agent-responses';
import { epicRepository } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await extractAgentAuth();
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return agentError('VALIDATION_ERROR', 'Invalid epic ID', 400);
    }

    const epic = await epicRepository.findByIdWithProject(id, orgId);
    if (!epic) {
      return agentError('NOT_FOUND', 'Epic not found', 404);
    }

    return agentSuccess(epic);
  } catch (error) {
    return handleAgentError(error);
  }
}
