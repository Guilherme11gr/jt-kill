import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { projectNoteRepository, featureRepository, epicRepository } from '@/infra/adapters/prisma';
import { z } from 'zod';

const convertSchema = z.object({
  epicId: z.string().uuid('Epic ID inválido'),
});

/**
 * POST /api/notes/[id]/convert - Convert a note to a feature
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // Get the note
    const note = await projectNoteRepository.findById(id, tenantId);
    if (!note) {
      return jsonError('NOT_FOUND', 'Ideia não encontrada', 404);
    }

    // Check if already converted
    if (note.status === 'CONVERTED') {
      return jsonError('CONFLICT', 'Esta ideia já foi convertida em feature', 409);
    }

    const body = await request.json();
    const parsed = convertSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    // Verify epic exists and belongs to org
    const epic = await epicRepository.findById(parsed.data.epicId, tenantId);
    if (!epic) {
      return jsonError('NOT_FOUND', 'Epic não encontrada', 404);
    }

    // Create the feature with note content
    const feature = await featureRepository.create({
      orgId: tenantId,
      epicId: parsed.data.epicId,
      title: note.title,
      description: note.content,
    });

    // Mark note as converted
    const updatedNote = await projectNoteRepository.convertToFeature(id, tenantId, feature.id);

    return jsonSuccess({
      note: updatedNote,
      feature: feature,
    }, { status: 201 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
