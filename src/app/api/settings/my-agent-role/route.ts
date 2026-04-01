import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { prisma } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authClient = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(authClient);

    const membership = await prisma.orgMembership.findUnique({
      where: { userId_orgId: { userId, orgId: tenantId } },
      select: {
        agentChatRoleId: true,
        agentChatRole: {
          select: { id: true, name: true, prompt: true },
        },
      },
    });

    return jsonSuccess({
      roleId: membership?.agentChatRoleId || null,
      role: membership?.agentChatRole || null,
    });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

export async function PATCH(request: Request) {
  try {
    const authClient = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(authClient);

    const body = (await request.json()) as Record<string, unknown>;
    const roleId = body.roleId === null ? null : typeof body.roleId === 'string' ? body.roleId : undefined;

    if (roleId !== null && roleId !== undefined) {
      // Validate the role belongs to the same org
      const role = await prisma.agentChatRole.findUnique({
        where: { id: roleId },
        select: { tenantId: true },
      });

      if (!role || role.tenantId !== tenantId) {
        return jsonError('NOT_FOUND', 'Role não encontrada.', 404);
      }
    }

    await prisma.orgMembership.update({
      where: { userId_orgId: { userId, orgId: tenantId } },
      data: {
        agentChatRoleId: roleId === undefined ? undefined : roleId,
      },
    });

    const updatedMembership = await prisma.orgMembership.findUnique({
      where: { userId_orgId: { userId, orgId: tenantId } },
      select: {
        agentChatRoleId: true,
        agentChatRole: {
          select: { id: true, name: true, prompt: true },
        },
      },
    });

    return jsonSuccess({
      roleId: updatedMembership?.agentChatRoleId || null,
      role: updatedMembership?.agentChatRole || null,
    });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
