import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError, BadRequestError } from '@/shared/errors';
import { userProfileRepository, auditLogRepository, prisma, AUDIT_ACTIONS } from '@/infra/adapters/prisma';

/**
 * POST /api/users/me/leave - Leave the organization voluntarily
 * Any authenticated user can leave their org
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(supabase);

    // Get current user
    const user = await userProfileRepository.findById(userId, tenantId);

    if (!user) {
      return jsonError('NOT_FOUND', 'Perfil não encontrado', 404);
    }

    // Use transaction to atomically check and delete to prevent race condition
    await prisma.$transaction(async (tx) => {
      // If user is OWNER, check if there are other OWNERs (atomic check)
      if (user.role === 'OWNER') {
        const ownerCount = await tx.userProfile.count({
          where: { orgId: tenantId, role: 'OWNER' }
        });

        if (ownerCount === 1) {
          throw new BadRequestError(
            'Você é o único proprietário. Transfira a propriedade para outro membro antes de sair.'
          );
        }
      }

      // Remove user from org
      await tx.userProfile.delete({
        where: { id: userId },
      });
    });

    // Log the action (outside transaction - fire and forget)
    await auditLogRepository.log({
      orgId: tenantId,
      userId,
      action: AUDIT_ACTIONS.USER_LEFT,
      targetType: 'user',
      targetId: userId,
      metadata: { userName: user.displayName, role: user.role },
    });

    return jsonSuccess({ message: 'Você saiu da organização' });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

