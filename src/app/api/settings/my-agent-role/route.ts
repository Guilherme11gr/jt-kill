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
        customAgentRolePrompt: true,
      },
    });

    const availableRoles = await prisma.agentChatRole.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, name: true, description: true },
    });

    return jsonSuccess({
      roleId: membership?.agentChatRoleId || null,
      role: membership?.agentChatRole || null,
      customPrompt: membership?.customAgentRolePrompt || null,
      availableRoles,
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
    const customPrompt = body.customPrompt === null ? null : typeof body.customPrompt === 'string' ? body.customPrompt.trim() : undefined;

    if (customPrompt !== undefined && customPrompt !== null && customPrompt.length > 2000) {
      return jsonError('VALIDATION_ERROR', 'O prompt personalizado deve ter no máximo 2000 caracteres.', 400);
    }

    if (roleId !== null && roleId !== undefined) {
      const role = await prisma.agentChatRole.findUnique({
        where: { id: roleId },
        select: { tenantId: true },
      });

      if (!role || role.tenantId !== tenantId) {
        return jsonError('NOT_FOUND', 'Role não encontrada.', 404);
      }
    }

    const data: Record<string, unknown> = {};

    if (customPrompt !== undefined) {
      data.customAgentRolePrompt = customPrompt;
      if (customPrompt) data.agentChatRoleId = null;
    }

    if (roleId !== undefined && customPrompt === undefined) {
      data.agentChatRoleId = roleId === null ? null : roleId;
      if (roleId) data.customAgentRolePrompt = null;
    }

    if (roleId === null && customPrompt === undefined) {
      data.agentChatRoleId = null;
      data.customAgentRolePrompt = null;
    }

    await prisma.orgMembership.update({
      where: { userId_orgId: { userId, orgId: tenantId } },
      data,
    });

    const updatedMembership = await prisma.orgMembership.findUnique({
      where: { userId_orgId: { userId, orgId: tenantId } },
      select: {
        agentChatRoleId: true,
        agentChatRole: {
          select: { id: true, name: true, prompt: true },
        },
        customAgentRolePrompt: true,
      },
    });

    return jsonSuccess({
      roleId: updatedMembership?.agentChatRoleId || null,
      role: updatedMembership?.agentChatRole || null,
      customPrompt: updatedMembership?.customAgentRolePrompt || null,
    });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
