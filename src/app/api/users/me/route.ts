import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { userProfileRepository } from '@/infra/adapters/prisma';
import type { AuthViewer } from '@/shared/types/auth.types';
import { z } from 'zod';

// Disable Next.js cache - data depends on org cookie
export const dynamic = 'force-dynamic';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

/**
 * GET /api/users/me - Get current user profile with memberships
 * 
 * Returns global user profile (displayName, avatarUrl) + org-specific context
 * (currentOrgId, currentRole, memberships).
 * 
 * Profile is auto-created on first access if it doesn't exist.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { userId, tenantId, memberships } = await extractAuthenticatedTenant(supabase);
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return jsonError('UNAUTHORIZED', 'Usuário não autenticado', 401);
    }

    // Find current role from memberships (source of truth)
    const currentMembership = memberships.find(m => m.orgId === tenantId);
    
    if (!currentMembership) {
      return jsonError('FORBIDDEN', 'Você não é membro desta organização', 403);
    }

    // 1. Try to get existing profile (global, not org-specific)
    let user = await userProfileRepository.findByIdGlobal(userId);
    
    // 2. If no profile exists, create one (first login)
    if (!user) {
      const displayName = typeof authUser.user_metadata.display_name === 'string'
        ? authUser.user_metadata.display_name
        : authUser.email?.split('@')[0] || 'Usuário';
      const avatarUrl = typeof authUser.user_metadata.avatar_url === 'string'
        ? authUser.user_metadata.avatar_url
        : null;

      // Create profile with data from auth provider
      user = await userProfileRepository.create({
        id: authUser.id,
        displayName,
        avatarUrl,
      });
    }

    // 3. Return profile with org context (role from OrgMembership)
    const viewer: AuthViewer = {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      forcePasswordReset: Boolean(authUser.forcePasswordReset),
      currentOrgId: tenantId,
      currentRole: currentMembership.role, // Always from OrgMembership
      memberships,
    };

    return jsonSuccess(viewer, {
      cache: 'none',
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * PATCH /api/users/me - Update current user profile
 * 
 * Only updates global profile data (displayName, avatarUrl).
 * Roles are managed through OrgMembership, not here.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { userId, tenantId, memberships } = await extractAuthenticatedTenant(supabase);
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return jsonError('UNAUTHORIZED', 'Usuário não autenticado', 401);
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const user = await userProfileRepository.updateGlobal(userId, parsed.data);

    const currentMembership = memberships.find((membership) => membership.orgId === tenantId);
    if (!currentMembership) {
      return jsonError('FORBIDDEN', 'Você não é membro desta organização', 403);
    }

    const viewer: AuthViewer = {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      forcePasswordReset: Boolean(authUser.forcePasswordReset),
      currentOrgId: tenantId,
      currentRole: currentMembership.role,
      memberships,
    };

    return jsonSuccess(viewer, {
      cache: 'none',
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
