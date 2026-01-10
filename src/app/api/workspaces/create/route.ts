import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { createWorkspace } from '@/domain/use-cases/workspace/create-workspace';
import { z } from 'zod';

const createWorkspaceSchema = z.object({
  workspaceName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50, 'Nome muito longo'),
});

/**
 * POST /api/workspaces/create
 * 
 * Create a new workspace (organization).
 * User becomes OWNER.
 * Limit: 5 workspaces per user.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const supabase = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(supabase);

    // 2. Validate input
    const body = await request.json();
    const parsed = createWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return jsonError('VALIDATION_ERROR', firstError.message, 400);
    }

    const { workspaceName } = parsed.data;

    // 3. Create workspace
    const result = await createWorkspace({
      userId,
      workspaceName,
      currentOrgId: tenantId, // For tracking where they came from
    });

    return jsonSuccess(
      {
        message: 'Workspace criado com sucesso',
        workspace: result,
      },
      { status: 201 }
    );

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
