import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError, ForbiddenError, NotFoundError, BadRequestError } from '@/shared/errors';
import { auditLogRepository, prisma, AUDIT_ACTIONS } from '@/infra/adapters/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/users/[id] - Remove user from current organization
 * In multi-org world, this removes the membership for a user in the current org only.
 * If it's the user's only org, also cleans up their UserProfile.
 * Requires: OWNER or ADMIN role (ADMIN can't remove OWNER)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createClient();
    const { userId, tenantId, memberships } = await extractAuthenticatedTenant(supabase);

    // Get current user's role from memberships
    const currentMembership = memberships.find(m => m.orgId === tenantId);

    if (!currentMembership) {
      throw new ForbiddenError('Você não é membro desta organização');
    }

    // Check permission - must be OWNER or ADMIN
    if (!['OWNER', 'ADMIN'].includes(currentMembership.role)) {
      throw new ForbiddenError('Permissão insuficiente para esta ação');
    }

    // Can't remove yourself via this endpoint
    if (targetUserId === userId) {
      throw new BadRequestError('Use o endpoint /api/users/me/leave para sair da organização');
    }

    // Find target user's membership in this org
    const targetMembership = await prisma.orgMembership.findUnique({
      where: {
        userId_orgId: { userId: targetUserId, orgId: tenantId }
      },
      include: {
        user: { select: { email: true } }
      }
    });

    if (!targetMembership) {
      throw new NotFoundError('Usuário não encontrado nesta organização');
    }

    // ADMIN can't remove OWNER
    if (currentMembership.role === 'ADMIN' && targetMembership.role === 'OWNER') {
      throw new ForbiddenError('Administradores não podem remover o proprietário');
    }

    // ADMIN can't remove other ADMINs
    if (currentMembership.role === 'ADMIN' && targetMembership.role === 'ADMIN') {
      throw new ForbiddenError('Administradores não podem remover outros administradores');
    }

    // Remove the membership (handles cascade for multi-org)
    await prisma.$transaction(async (tx) => {
      // Delete membership from this org
      await tx.orgMembership.delete({
        where: {
          userId_orgId: { userId: targetUserId, orgId: tenantId }
        }
      });

      // Check if user has any remaining memberships
      const remainingMemberships = await tx.orgMembership.count({
        where: { userId: targetUserId }
      });

      // If no remaining memberships, clean up UserProfile
      if (remainingMemberships === 0) {
        await tx.userProfile.delete({
          where: { id: targetUserId }
        });
      }
    });

    // Log the action
    await auditLogRepository.log({
      orgId: tenantId,
      userId,
      action: AUDIT_ACTIONS.USER_REMOVED,
      targetType: 'user',
      targetId: targetUserId,
      metadata: {
        removedUserEmail: targetMembership.user?.email,
        removedUserRole: targetMembership.role,
      },
    });

    return jsonSuccess({ message: 'Usuário removido da organização' });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

