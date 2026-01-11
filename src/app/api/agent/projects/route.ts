/**
 * Agent API - Projects List
 * 
 * GET /api/agent/projects - List all projects (read-only)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentList, agentError, handleAgentError } from '@/shared/http/agent-responses';
import { projectRepository } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await extractAgentAuth();

    const { searchParams } = new URL(request.url);
    const query = listQuerySchema.safeParse({
      limit: searchParams.get('limit') || 50,
    });

    if (!query.success) {
      return agentError('VALIDATION_ERROR', 'Invalid query parameters', 400);
    }

    const { limit } = query.data;

    const projects = await projectRepository.findMany(orgId);

    // Apply limit
    const limited = projects.slice(0, limit);

    return agentList(limited, projects.length);
  } catch (error) {
    return handleAgentError(error);
  }
}
