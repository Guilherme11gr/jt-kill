import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, extractUserId } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { userProfileRepository } from '@/infra/adapters/prisma';
import { z } from 'zod';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

/**
 * GET /api/users/me - Get current user profile with memberships
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { userId, tenantId, memberships } = await extractAuthenticatedTenant(supabase);

    const user = await userProfileRepository.findById(userId, tenantId);
    if (!user) {
      return jsonError('NOT_FOUND', 'Perfil não encontrado', 404);
    }

    // Find current role from memberships
    const currentMembership = memberships.find(m => m.orgId === tenantId);

    return jsonSuccess({
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      currentOrgId: tenantId,
      currentRole: currentMembership?.role ?? user.role,
      memberships,
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * PATCH /api/users/me - Update current user profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);
    const userId = await extractUserId(supabase);

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const user = await userProfileRepository.update(userId, tenantId, parsed.data);

    return jsonSuccess({
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
