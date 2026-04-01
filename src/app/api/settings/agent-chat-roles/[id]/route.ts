import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, requireRole } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { prisma } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

const MAX_PROMPT_CHARS = 2000;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authClient = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(authClient);

    await requireRole(authClient, userId, ['OWNER'], tenantId);

    const { id } = await params;

    const existing = await prisma.agentChatRole.findUnique({
      where: { id },
      select: { tenantId: true, isDefault: true },
    });

    if (!existing || existing.tenantId !== tenantId) {
      return jsonError('NOT_FOUND', 'Role não encontrada.', 404);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const description = typeof body.description === 'string' ? body.description.trim() : undefined;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : undefined;
    const isDefault = typeof body.isDefault === 'boolean' ? body.isDefault : undefined;

    if (prompt !== undefined && prompt.length > MAX_PROMPT_CHARS) {
      return jsonError('VALIDATION_ERROR', `O prompt deve ter no máximo ${MAX_PROMPT_CHARS} caracteres.`, 400);
    }

    if (isDefault === true) {
      await prisma.$transaction([
        prisma.agentChatRole.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false },
        }),
        prisma.agentChatRole.update({
          where: { id },
          data: {
            ...(name !== undefined ? { name } : {}),
            ...(description !== undefined ? { description: description || null } : {}),
            ...(prompt !== undefined ? { prompt } : {}),
            isDefault: true,
          },
          select: {
            id: true,
            name: true,
            description: true,
            prompt: true,
            isDefault: true,
          },
        }),
      ]);

      const updated = await prisma.agentChatRole.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          prompt: true,
          isDefault: true,
        },
      });

      return jsonSuccess(updated);
    }

    const updated = await prisma.agentChatRole.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(prompt !== undefined ? { prompt } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        prompt: true,
        isDefault: true,
      },
    });

    return jsonSuccess(updated);
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authClient = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(authClient);

    await requireRole(authClient, userId, ['OWNER'], tenantId);

    const { id } = await params;

    const existing = await prisma.agentChatRole.findUnique({
      where: { id },
      select: { tenantId: true, isDefault: true },
    });

    if (!existing || existing.tenantId !== tenantId) {
      return jsonError('NOT_FOUND', 'Role não encontrada.', 404);
    }

    await prisma.$transaction(async (tx) => {
      // Clear agentChatRoleId from any memberships using this role
      await tx.orgMembership.updateMany({
        where: { agentChatRoleId: id },
        data: { agentChatRoleId: null },
      });

      // Delete the role
      await tx.agentChatRole.delete({
        where: { id },
      });

      // If the deleted role was default, promote first remaining role
      if (existing.isDefault) {
        const firstRemaining = await tx.agentChatRole.findFirst({
          where: { tenantId },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        });

        if (firstRemaining) {
          await tx.agentChatRole.update({
            where: { id: firstRemaining.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
