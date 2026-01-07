import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { projectNoteRepository } from '@/infra/adapters/prisma';
import { z } from 'zod';

const archiveSchema = z.object({
  unarchive: z.boolean().optional().default(false),
});

/**
 * POST /api/notes/[id]/archive - Archive or unarchive a note
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const body = await request.json().catch(() => ({}));
    const parsed = archiveSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    let note;
    if (parsed.data.unarchive) {
      note = await projectNoteRepository.unarchive(id, tenantId);
    } else {
      note = await projectNoteRepository.archive(id, tenantId);
    }

    return jsonSuccess(note);

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
