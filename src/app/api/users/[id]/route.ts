import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, requireRole } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError, ForbiddenError, NotFoundError, BadRequestError } from '@/shared/errors';
import { userProfileRepository, auditLogRepository, prisma, AUDIT_ACTIONS } from '@/infra/adapters/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/users/[id] - Remove user from organization
 * Requires: OWNER or ADMIN role (ADMIN can't remove OWNER)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(supabase);

    // Check permission - OWNER or ADMIN
    await requireRole(supabase, userId, ['OWNER', 'ADMIN']);

    // Can't remove yourself via this endpoint
    if (targetUserId === userId) {
      throw new BadRequestError('Use o endpoint /api/users/me/leave para sair da organização');
    }

    // Find target user
    const targetUser = await userProfileRepository.findById(targetUserId, tenantId);

    if (!targetUser) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Get current user's role
    const currentUser = await userProfileRepository.findById(userId, tenantId);

    // ADMIN can't remove OWNER
    if (currentUser?.role === 'ADMIN' && targetUser.role === 'OWNER') {
      throw new ForbiddenError('Administradores não podem remover o proprietário');
    }

    // ADMIN can't remove other ADMINs
    if (currentUser?.role === 'ADMIN' && targetUser.role === 'ADMIN') {
      throw new ForbiddenError('Administradores não podem remover outros administradores');
    }

    // Remove the user
    await prisma.userProfile.delete({
      where: { id: targetUserId },
    });

    // Log the action
    await auditLogRepository.log({
      orgId: tenantId,
      userId,
      action: AUDIT_ACTIONS.USER_REMOVED,
      targetType: 'user',
      targetId: targetUserId,
      metadata: {
        removedUserName: targetUser.displayName,
        removedUserRole: targetUser.role,
      },
    });

    return jsonSuccess({ message: 'Usuário removido da organização' });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
