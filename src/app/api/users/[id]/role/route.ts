import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, requireRole } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError, ForbiddenError, NotFoundError, BadRequestError } from '@/shared/errors';
import { userProfileRepository, auditLogRepository, prisma, AUDIT_ACTIONS } from '@/infra/adapters/prisma';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const changeRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']), // Can't change to/from OWNER via this endpoint
});

/**
 * PATCH /api/users/[id]/role - Change user's role
 * Requires: OWNER role only
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(supabase);

    // Only OWNER can change roles
    await requireRole(supabase, userId, ['OWNER']);

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

    // Find target user
    const targetUser = await userProfileRepository.findById(targetUserId, tenantId);

    if (!targetUser) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Can't change OWNER's role
    if (targetUser.role === 'OWNER') {
      throw new ForbiddenError('Não é possível alterar o papel do proprietário');
    }

    const oldRole = targetUser.role;

    // Update role
    await prisma.userProfile.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

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
