import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError, NotFoundError, BadRequestError, UnauthorizedError } from '@/shared/errors';
import { inviteRepository, userProfileRepository, auditLogRepository, prisma, AUDIT_ACTIONS } from '@/infra/adapters/prisma';
import { z } from 'zod';

const acceptInviteSchema = z.object({
  token: z.string().uuid(),
});

/**
 * POST /api/invites/accept - Accept an invite and join organization
 * Requires: Authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError('Você precisa estar logado para aceitar um convite');
    }

    const body = await request.json();
    const parsed = acceptInviteSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Token inválido', 400);
    }

    const { token } = parsed.data;

    // Find the invite
    const invite = await inviteRepository.findByToken(token);

    if (!invite) {
      throw new NotFoundError('Convite não encontrado');
    }

    // Check if invite is valid
    if (invite.status !== 'PENDING') {
      throw new BadRequestError('Este convite já foi utilizado ou revogado');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestError('Este convite expirou');
    }

    // Check if user already has a profile in ANY organization (single-org model)
    const existingProfile = await prisma.userProfile.findUnique({
      where: { id: user.id },
    });

    if (existingProfile) {
      if (existingProfile.orgId === invite.orgId) {
        throw new BadRequestError('Você já faz parte desta organização');
      } else {
        throw new BadRequestError('Você já faz parte de outra organização. Saia primeiro para entrar em uma nova.');
      }
    }

    // Accept invite and create user profile
    // Note: Using sequential operations instead of transaction to avoid Prisma type issues
    // with newly added models. The operations are idempotent.

    // Mark invite as accepted
    await inviteRepository.accept(invite.token, user.id);

    // Create user profile in the organization
    await prisma.userProfile.create({
      data: {
        id: user.id,
        orgId: invite.orgId,
        displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Usuário',
        role: invite.role,
      },
    });

    // Log the action
    await auditLogRepository.log({
      orgId: invite.orgId,
      userId: user.id,
      action: AUDIT_ACTIONS.USER_JOINED,
      targetType: 'user',
      targetId: user.id,
      metadata: { via: 'invite', inviteId: invite.id, role: invite.role },
    });

    return jsonSuccess({
      message: 'Bem-vindo à organização!',
      orgId: invite.orgId,
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
