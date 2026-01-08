import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, requireRole } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError, BadRequestError, NotFoundError } from '@/shared/errors';
import { userProfileRepository, auditLogRepository, prisma, AUDIT_ACTIONS } from '@/infra/adapters/prisma';
import { z } from 'zod';

const transferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid(),
});

/**
 * POST /api/users/transfer-ownership - Transfer organization ownership to another user
 * Requires: Current OWNER only
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(supabase);

    // Only OWNER can transfer ownership
    await requireRole(supabase, userId, ['OWNER']);

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

    // Find new owner
    const newOwner = await userProfileRepository.findById(newOwnerId, tenantId);

    if (!newOwner) {
      throw new NotFoundError('Usuário não encontrado na organização');
    }

    // Transfer ownership in transaction
    await prisma.$transaction(async (tx) => {
      // Demote current owner to ADMIN
      await tx.userProfile.update({
        where: { id: userId },
        data: { role: 'ADMIN' },
      });

      // Promote new owner
      await tx.userProfile.update({
        where: { id: newOwnerId },
        data: { role: 'OWNER' },
      });
    });

    // Log both actions (outside transaction to avoid type issues)
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
      metadata: { oldRole: newOwner.role, newRole: 'OWNER', reason: 'ownership_transfer' },
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
