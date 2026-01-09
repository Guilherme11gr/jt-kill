import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError, BadRequestError } from '@/shared/errors';
import { auditLogRepository, prisma, AUDIT_ACTIONS } from '@/infra/adapters/prisma';

/**
 * POST /api/users/me/leave - Leave the current organization
 * In multi-org world, this removes the membership for the current org only.
 * If it's the user's only org, also removes their UserProfile.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { userId, tenantId, memberships } = await extractAuthenticatedTenant(supabase);

    // Get current membership for this org
    const currentMembership = memberships.find(m => m.orgId === tenantId);

    if (!currentMembership) {
      return jsonError('NOT_FOUND', 'Você não é membro desta organização', 404);
    }

    // Use transaction to atomically check and delete
    await prisma.$transaction(async (tx) => {
      // If user is OWNER, check if there are other OWNERs
      if (currentMembership.role === 'OWNER') {
        const ownerCount = await tx.orgMembership.count({
          where: { orgId: tenantId, role: 'OWNER' }
        });

        if (ownerCount === 1) {
          throw new BadRequestError(
            'Você é o único proprietário. Transfira a propriedade para outro membro antes de sair.'
          );
        }
      }

      // Remove membership from this org
      await tx.orgMembership.delete({
        where: {
          userId_orgId: { userId, orgId: tenantId }
        }
      });

      // If this was the user's only org, also clean up UserProfile
      const remainingMemberships = await tx.orgMembership.count({
        where: { userId }
      });

      if (remainingMemberships === 0) {
        await tx.userProfile.delete({
          where: { id: userId }
        });
      } else {
        // If user had their default org removed, set a new default
        const hasDefault = await tx.orgMembership.findFirst({
          where: { userId, isDefault: true }
        });

        if (!hasDefault) {
          // Set the first remaining membership as default
          const firstMembership = await tx.orgMembership.findFirst({
            where: { userId }
          });
          if (firstMembership) {
            await tx.orgMembership.update({
              where: { id: firstMembership.id },
              data: { isDefault: true }
            });
          }
        }
      }
    });

    // Log the action
    await auditLogRepository.log({
      orgId: tenantId,
      userId,
      action: AUDIT_ACTIONS.USER_LEFT,
      targetType: 'user',
      targetId: userId,
      metadata: { role: currentMembership.role },
    });

    return jsonSuccess({
      message: 'Você saiu da organização',
      remainingOrgs: memberships.length - 1
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}


