import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, requireRole } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError, NotFoundError, BadRequestError } from '@/shared/errors';
import { inviteRepository, auditLogRepository, AUDIT_ACTIONS } from '@/infra/adapters/prisma';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/invites/[token] - Get invite details (public - for invite acceptance page)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    const details = await inviteRepository.getInviteDetails(token);

    if (!details) {
      throw new NotFoundError('Convite não encontrado');
    }

    const { invite, orgName } = details;

    // Check if invite is valid
    if (invite.status !== 'PENDING') {
      return jsonError('INVITE_USED', 'Este convite já foi utilizado ou revogado', 400);
    }

    if (invite.expiresAt < new Date()) {
      return jsonError('INVITE_EXPIRED', 'Este convite expirou', 400);
    }

    return jsonSuccess({
      token: invite.token,
      orgName,
      role: invite.role,
      expiresAt: invite.expiresAt,
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * DELETE /api/invites/[token] - Revoke an invite
 * Requires: OWNER or ADMIN role
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const supabase = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(supabase);

    // Check permission
    await requireRole(supabase, userId, ['OWNER', 'ADMIN']);

    // Find the invite
    const invite = await inviteRepository.findByToken(token);

    if (!invite || invite.orgId !== tenantId) {
      throw new NotFoundError('Convite não encontrado');
    }

    if (invite.status !== 'PENDING') {
      throw new BadRequestError('Convite já foi utilizado ou revogado');
    }

    // Revoke the invite
    await inviteRepository.revoke(invite.id, tenantId);

    // Log the action
    await auditLogRepository.log({
      orgId: tenantId,
      userId,
      action: AUDIT_ACTIONS.INVITE_REVOKED,
      targetType: 'invite',
      targetId: invite.id,
      metadata: { email: invite.email, role: invite.role },
    });

    return jsonSuccess({ message: 'Convite revogado com sucesso' });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
