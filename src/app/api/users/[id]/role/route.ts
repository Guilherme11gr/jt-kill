import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, invalidateMembershipCache } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError, ForbiddenError, NotFoundError, BadRequestError } from '@/shared/errors';
import { auditLogRepository, prisma, AUDIT_ACTIONS } from '@/infra/adapters/prisma';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const changeRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']), // Can't change to/from OWNER via this endpoint
});

/**
 * PATCH /api/users/[id]/role - Change user's role in current organization
 * Only updates role for this org, not across all orgs.
 * Requires: OWNER role only
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createClient();
    const { userId, tenantId, memberships } = await extractAuthenticatedTenant(supabase);

    // Get current user's role
    const currentMembership = memberships.find(m => m.orgId === tenantId);

    if (!currentMembership || currentMembership.role !== 'OWNER') {
      throw new ForbiddenError('Apenas o proprietário pode alterar papéis');
    }

    // Can't change your own role
    if (targetUserId === userId) {
      throw new BadRequestError('Você não pode alterar seu próprio papel');
    }

    const body = await request.json();
    const parsed = changeRoleSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Role inválido', 400);
    }

    const { role: newRole } = parsed.data;

    // Find target user's membership in this org
    const targetMembership = await prisma.orgMembership.findUnique({
      where: {
        userId_orgId: { userId: targetUserId, orgId: tenantId }
      }
    });

    if (!targetMembership) {
      throw new NotFoundError('Usuário não encontrado nesta organização');
    }

    // Can't change OWNER's role
    if (targetMembership.role === 'OWNER') {
      throw new ForbiddenError('Não é possível alterar o papel do proprietário');
    }

    const oldRole = targetMembership.role;

    // Update role in OrgMembership (source of truth)
    await prisma.orgMembership.update({
      where: {
        userId_orgId: { userId: targetUserId, orgId: tenantId }
      },
      data: { role: newRole },
    });

    // @deprecated: Sync with UserProfile.role for backward compatibility
    // TODO: Remove after all code migrated to use OrgMembership.role
    const userProfile = await prisma.userProfile.findUnique({
      where: { id: targetUserId }
    });
    if (userProfile && userProfile.orgId === tenantId) {
      await prisma.userProfile.update({
        where: { id: targetUserId },
        data: { role: newRole },
      });
    }

    // Invalidate membership cache (critical for performance)
    invalidateMembershipCache(targetUserId);

    // Log the action
    await auditLogRepository.log({
      orgId: tenantId,
      userId,
      action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
      targetType: 'user',
      targetId: targetUserId,
      metadata: { oldRole, newRole },
    });

    return jsonSuccess({
      message: 'Papel alterado com sucesso',
      role: newRole,
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

