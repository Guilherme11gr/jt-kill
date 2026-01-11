/**
 * Agent API - Epics List
 * 
 * GET /api/agent/epics - List epics with filters (read-only)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentList, agentError, handleAgentError } from '@/shared/http/agent-responses';
import { epicRepository } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

const listQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await extractAgentAuth();

    const { searchParams } = new URL(request.url);
    const query = listQuerySchema.safeParse({
      projectId: searchParams.get('projectId') || undefined,
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') || 50,
    });

    if (!query.success) {
      return agentError('VALIDATION_ERROR', 'Invalid query parameters', 400);
    }

    const { projectId, status, limit } = query.data;

    let epics;
    if (projectId) {
      epics = await epicRepository.findMany(projectId, orgId);
    } else {
      epics = await epicRepository.findAllByOrg(orgId);
    }

    // Apply status filter if provided
    if (status) {
      epics = epics.filter((e: { status: string }) => e.status === status);
    }

    // Apply limit
    epics = epics.slice(0, limit);

    return agentList(epics, epics.length);
  } catch (error) {
    return handleAgentError(error);
  }
}
