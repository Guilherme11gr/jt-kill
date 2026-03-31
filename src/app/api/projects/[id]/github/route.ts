import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { prisma } from '@/infra/adapters/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return jsonError('INVALID_CONTENT_TYPE', 'Content-Type must be application/json', 415);
    }

    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const project = await prisma.project.findFirst({
      where: { id, orgId: tenantId },
      select: { id: true, githubInstallationId: true },
    });

    if (!project) {
      return jsonError('NOT_FOUND', 'Project not found', 404);
    }

    await prisma.project.update({
      where: { id },
      data: {
        githubInstallationId: null,
        githubRepoFullName: null,
        githubRepoUrl: null,
      },
    });

    return jsonSuccess({ disconnected: true });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
