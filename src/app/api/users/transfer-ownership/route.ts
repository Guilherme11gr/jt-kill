import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, invalidateMembershipCache } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError, BadRequestError, NotFoundError, ForbiddenError } from '@/shared/errors';
import { auditLogRepository, prisma, AUDIT_ACTIONS } from '@/infra/adapters/prisma';
import { z } from 'zod';

const transferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid(),
});

/**
 * POST /api/users/transfer-ownership - Transfer organization ownership to another user
 * Updates role in both OrgMembership and UserProfile for consistency.
 * Requires: Current OWNER only
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { userId, tenantId, memberships } = await extractAuthenticatedTenant(supabase);

    // Check current user is OWNER
    const currentMembership = memberships.find(m => m.orgId === tenantId);
    if (!currentMembership || currentMembership.role !== 'OWNER') {
      throw new ForbiddenError('Apenas o proprietário pode transferir a propriedade');
    }

    const body = await request.json();
    const parsed = transferOwnershipSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'ID de usuário inválido', 400);
    }

    const { newOwnerId } = parsed.data;

    // Can't transfer to yourself
    if (newOwnerId === userId) {
      throw new BadRequestError('Você não pode transferir a propriedade para si mesmo');
    }

    // Find new owner's membership in this org
    const newOwnerMembership = await prisma.orgMembership.findUnique({
      where: {
        userId_orgId: { userId: newOwnerId, orgId: tenantId }
      }
    });

    if (!newOwnerMembership) {
      throw new NotFoundError('Usuário não encontrado nesta organização');
    }

    const oldNewOwnerRole = newOwnerMembership.role;

    // Transfer ownership in transaction
    await prisma.$transaction(async (tx) => {
      // Update current owner's membership to ADMIN
      await tx.orgMembership.update({
        where: { userId_orgId: { userId, orgId: tenantId } },
        data: { role: 'ADMIN' },
      });

      // Update new owner's membership to OWNER
      await tx.orgMembership.update({
        where: { userId_orgId: { userId: newOwnerId, orgId: tenantId } },
        data: { role: 'OWNER' },
      });

      // @deprecated: Sync with UserProfile.role for backward compatibility
      // TODO: Remove after all code migrated to use OrgMembership.role
      const currentUserProfile = await tx.userProfile.findUnique({ where: { id: userId } });
      if (currentUserProfile?.orgId === tenantId) {
        await tx.userProfile.update({
          where: { id: userId },
          data: { role: 'ADMIN' },
        });
      }

      const newOwnerProfile = await tx.userProfile.findUnique({ where: { id: newOwnerId } });
      if (newOwnerProfile?.orgId === tenantId) {
        await tx.userProfile.update({
          where: { id: newOwnerId },
          data: { role: 'OWNER' },
        });
      }
    });

    // Invalidate cache for both users (critical for performance)
    invalidateMembershipCache(userId);
    invalidateMembershipCache(newOwnerId);

    // Log both actions
    await auditLogRepository.log({
      orgId: tenantId,
      userId,
      action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
      targetType: 'user',
      targetId: userId,
      metadata: { oldRole: 'OWNER', newRole: 'ADMIN', reason: 'ownership_transfer' },
    });

    await auditLogRepository.log({
      orgId: tenantId,
      userId,
      action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
      targetType: 'user',
      targetId: newOwnerId,
      metadata: { oldRole: oldNewOwnerRole, newRole: 'OWNER', reason: 'ownership_transfer' },
    });

    return jsonSuccess({
      message: 'Propriedade transferida com sucesso',
      newOwnerId,
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

