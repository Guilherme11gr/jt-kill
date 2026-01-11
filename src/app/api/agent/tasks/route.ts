/**
 * Agent API - Tasks List & Create
 * 
 * GET /api/agent/tasks - List tasks with filters
 * POST /api/agent/tasks - Create a new task
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentList, agentSuccess, agentError, handleAgentError } from '@/shared/http/agent-responses';
import { taskRepository, featureRepository } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

// ============ GET - List Tasks ============

const listQuerySchema = z.object({
  featureId: z.string().uuid().optional(),
  epicId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  status: z.enum(['BACKLOG', 'TODO', 'DOING', 'REVIEW', 'DONE']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await extractAgentAuth();

    const { searchParams } = new URL(request.url);
    const query = listQuerySchema.safeParse({
      featureId: searchParams.get('featureId') || undefined,
      epicId: searchParams.get('epicId') || undefined,
      projectId: searchParams.get('projectId') || undefined,
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') || 50,
    });

    if (!query.success) {
      return agentError('VALIDATION_ERROR', 'Invalid query parameters', 400);
    }

    const { featureId, epicId, projectId, status, limit } = query.data;

    // Build filter object
    const filter: Record<string, unknown> = {};
    if (featureId) filter.featureId = featureId;
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;

    // If epicId provided, we need to get all features first then filter tasks
    if (epicId) {
      filter.epicId = epicId;
    }

    const tasks = await taskRepository.findMany(orgId, filter);
    const limited = tasks.slice(0, limit);

    return agentList(limited, tasks.length);
  } catch (error) {
    return handleAgentError(error);
  }
}

// ============ POST - Create Task ============

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  featureId: z.string().uuid('Invalid feature ID'),
  description: z.string().optional(),
  type: z.enum(['TASK', 'BUG']).default('TASK'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  status: z.enum(['BACKLOG', 'TODO', 'DOING', 'REVIEW', 'DONE']).default('BACKLOG'),
});

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await extractAgentAuth();

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return agentError('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { title, featureId, description, type, priority, status } = parsed.data;

    // Verify feature exists
    const feature = await featureRepository.findById(featureId, orgId);
    if (!feature) {
      return agentError('NOT_FOUND', 'Feature not found', 404);
    }

    const task = await taskRepository.create({
      title,
      featureId,
      description: description || null,
      type,
      priority,
      status,
      orgId,
    });

    return agentSuccess(task, 201);
  } catch (error) {
    return handleAgentError(error);
  }
}
