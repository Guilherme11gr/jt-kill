/**
 * Task Tags API Routes
 * GET /api/projects/[id]/task-tags - List all tags for a project
 * POST /api/projects/[id]/task-tags - Create a new tag
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { taskTagRepository } from '@/infra/adapters/prisma';
import { z } from 'zod';

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(200).optional(),
});

/**
 * GET /api/projects/[id]/task-tags
 * List all task tags for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const tags = await taskTagRepository.findByProjectWithCounts(projectId, tenantId);
    return jsonSuccess(tags);
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * POST /api/projects/[id]/task-tags
 * Create a new task tag
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const body = await request.json();
    const validated = createTagSchema.parse(body);

    const tag = await taskTagRepository.create(tenantId, {
      projectId,
      name: validated.name,
      color: validated.color,
      description: validated.description,
    });

    return jsonSuccess(tag, { status: 201 });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
