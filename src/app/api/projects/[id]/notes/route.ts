import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { projectNoteRepository, projectRepository } from '@/infra/adapters/prisma';
import { z } from 'zod';

// Type for NoteStatus (must match Prisma enum after migration)
type NoteStatus = 'ACTIVE' | 'ARCHIVED' | 'CONVERTED';
const NOTE_STATUSES: NoteStatus[] = ['ACTIVE', 'ARCHIVED', 'CONVERTED'];

const createNoteSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  content: z.string().max(100000), // 100KB max
});

/**
 * GET /api/projects/[id]/notes - List notes for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // Verify project exists and belongs to org
    const project = await projectRepository.findById(projectId, tenantId);
    if (!project) {
      return jsonError('NOT_FOUND', 'Projeto não encontrado', 404);
    }

    // Check for status filter in query params
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    let status: NoteStatus | undefined;

    if (statusParam && NOTE_STATUSES.includes(statusParam as NoteStatus)) {
      status = statusParam as NoteStatus;
    }

    const notes = await projectNoteRepository.findByProjectId(projectId, tenantId, status as never);
    return jsonSuccess(notes);

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * POST /api/projects/[id]/notes - Create a new note
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // Verify project exists and belongs to org
    const project = await projectRepository.findById(projectId, tenantId);
    if (!project) {
      return jsonError('NOT_FOUND', 'Projeto não encontrado', 404);
    }

    const body = await request.json();
    const parsed = createNoteSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const note = await projectNoteRepository.create({
      orgId: tenantId,
      projectId,
      title: parsed.data.title,
      content: parsed.data.content,
    });

    return jsonSuccess(note, { status: 201 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
