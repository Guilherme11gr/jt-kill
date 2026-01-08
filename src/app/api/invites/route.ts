import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, requireRole } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError, ForbiddenError } from '@/shared/errors';
import { inviteRepository, auditLogRepository, AUDIT_ACTIONS } from '@/infra/adapters/prisma';
import { z } from 'zod';

const createInviteSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'MEMBER']), // Can't invite OWNER
  expiresInDays: z.number().min(1).max(30).default(7),
});

/**
 * POST /api/invites - Create a new invite link
 * Requires: OWNER or ADMIN role
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(supabase);

    // Check if user has permission to create invites
    await requireRole(supabase, userId, ['OWNER', 'ADMIN']);

    const body = await request.json();
    const parsed = createInviteSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const { email, role, expiresInDays } = parsed.data;

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite = await inviteRepository.create({
      orgId: tenantId,
      email,
      role,
      createdBy: userId,
      expiresAt,
    });

    // Log the action
    await auditLogRepository.log({
      orgId: tenantId,
      userId,
      action: AUDIT_ACTIONS.INVITE_CREATED,
      targetType: 'invite',
      targetId: invite.id,
      metadata: { email, role, expiresAt: expiresAt.toISOString() },
    });

    // Generate invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const inviteUrl = `${baseUrl}/invite/${invite.token}`;

    return jsonSuccess({
      id: invite.id,
      token: invite.token,
      url: inviteUrl,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    }, { status: 201 });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * GET /api/invites - List all pending invites for the organization
 * Requires: OWNER or ADMIN role
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(supabase);

    // Check if user has permission to view invites
    await requireRole(supabase, userId, ['OWNER', 'ADMIN']);

    const invites = await inviteRepository.findPendingByOrgId(tenantId);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    return jsonSuccess(invites.map(invite => ({
      id: invite.id,
      url: `${baseUrl}/invite/${invite.token}`,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    })));

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
