/**
 * Agent API - Doc by ID
 * 
 * GET /api/agent/docs/:id - Get doc by ID
 * PATCH /api/agent/docs/:id - Update doc
 * DELETE /api/agent/docs/:id - Delete doc
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractAgentAuth } from '@/shared/http/agent-auth';
import { agentSuccess, agentError, handleAgentError } from '@/shared/http/agent-responses';
import { projectDocRepository } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

// ============ GET - Get Doc by ID ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await extractAgentAuth();
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return agentError('VALIDATION_ERROR', 'Invalid doc ID', 400);
    }

    const doc = await projectDocRepository.findByIdWithTags(id, orgId);
    if (!doc) {
      return agentError('NOT_FOUND', 'Doc not found', 404);
    }

    return agentSuccess(doc);
  } catch (error) {
    return handleAgentError(error);
  }
}

// ============ PATCH - Update Doc ============

const updateDocSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await extractAgentAuth();
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return agentError('VALIDATION_ERROR', 'Invalid doc ID', 400);
    }

    // Verify doc exists
    const existing = await projectDocRepository.findById(id, orgId);
    if (!existing) {
      return agentError('NOT_FOUND', 'Doc not found', 404);
    }

    const body = await request.json();
    const parsed = updateDocSchema.safeParse(body);

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

    const updated = await projectDocRepository.update(id, orgId, updateData);

    return agentSuccess(updated);
  } catch (error) {
    return handleAgentError(error);
  }
}

// ============ DELETE - Delete Doc ============
// DISABLED: Operações destrutivas desabilitadas por precaução

export async function DELETE() {
  return agentError('DISABLED', 'DELETE operations are disabled for safety', 403);
}
