/**
 * Agent API - Epic by ID
 * 
 * GET /api/agent/epics/:id - Get epic by ID with features
 * PATCH /api/agent/epics/:id - Update epic
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

// ============ PATCH - Update Epic ============

const updateEpicSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await extractAgentAuth();
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return agentError('VALIDATION_ERROR', 'Invalid epic ID', 400);
    }

    // Verify epic exists
    const existing = await epicRepository.findById(id, orgId);
    if (!existing) {
      return agentError('NOT_FOUND', 'Epic not found', 404);
    }

    const body = await request.json();
    const parsed = updateEpicSchema.safeParse(body);

    if (!parsed.success) {
      return agentError('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    // Filter out undefined values
    const updateData = Object.fromEntries(
      Object.entries(parsed.data).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(updateData).length === 0) {
      return agentError('VALIDATION_ERROR', 'No fields to update', 400);
    }

    const updated = await epicRepository.update(id, orgId, updateData);

    return agentSuccess(updated);
  } catch (error) {
    return handleAgentError(error);
  }
}
