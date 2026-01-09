/**
 * Task Tag Detail API Routes
 * GET /api/projects/[id]/task-tags/[tagId] - Get a tag by ID
 * PUT /api/projects/[id]/task-tags/[tagId] - Update a tag
 * DELETE /api/projects/[id]/task-tags/[tagId] - Delete a tag
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { taskTagRepository } from '@/infra/adapters/prisma';
import { z } from 'zod';

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(200).optional().nullable(),
});

type RouteParams = {
  params: Promise<{ id: string; tagId: string }>;
};

/**
 * GET /api/projects/[id]/task-tags/[tagId]
 * Get a single tag by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tagId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const tag = await taskTagRepository.findById(tagId, tenantId);
    if (!tag) {
      return jsonError('NOT_FOUND', 'Tag não encontrada', 404);
    }

    return jsonSuccess(tag);
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * PUT /api/projects/[id]/task-tags/[tagId]
 * Update a tag
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tagId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const body = await request.json();
    const validated = updateTagSchema.parse(body);

    const tag = await taskTagRepository.update(tagId, tenantId, validated);
    return jsonSuccess(tag);
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * DELETE /api/projects/[id]/task-tags/[tagId]
 * Delete a tag (cascade removes all assignments)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tagId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    await taskTagRepository.delete(tagId, tenantId);
    return new Response(null, { status: 204 });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
