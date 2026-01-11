/**
 * Agent API - Doc Tags List & Create
 * 
 * GET /api/agent/tags - List tags for a project
 * POST /api/agent/tags - Create a new tag
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentList, agentSuccess, agentError, handleAgentError } from '@/shared/http/agent-responses';
import { docTagRepository, projectRepository } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

// ============ GET - List Tags ============

const listQuerySchema = z.object({
  projectId: z.string().uuid(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await extractAgentAuth();

    const { searchParams } = new URL(request.url);
    const query = listQuerySchema.safeParse({
      projectId: searchParams.get('projectId'),
      limit: searchParams.get('limit') || 50,
    });

    if (!query.success) {
      return agentError('VALIDATION_ERROR', 'projectId is required', 400);
    }

    const { projectId, limit } = query.data;

    const tags = await docTagRepository.findByProjectId(projectId, orgId);
    const limited = tags.slice(0, limit);

    return agentList(limited, tags.length);
  } catch (error) {
    return handleAgentError(error);
  }
}

// ============ POST - Create Tag ============

const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  projectId: z.string().uuid('Invalid project ID'),
});

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await extractAgentAuth();

    const body = await request.json();
    const parsed = createTagSchema.safeParse(body);

    if (!parsed.success) {
      return agentError('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { name, projectId } = parsed.data;

    // Verify project exists
    const project = await projectRepository.findById(projectId, orgId);
    if (!project) {
      return agentError('NOT_FOUND', 'Project not found', 404);
    }

    // Check for duplicate name
    const existing = await docTagRepository.findByName(name, projectId, orgId);
    if (existing) {
      return agentError('CONFLICT', 'Tag with this name already exists', 409);
    }

    const tag = await docTagRepository.create({
      name,
      projectId,
      orgId,
    });

    return agentSuccess(tag, 201);
  } catch (error) {
    return handleAgentError(error);
  }
}
