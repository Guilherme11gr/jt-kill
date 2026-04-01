import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, requireRole } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { prisma } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

const MAX_ROLES = 5;
const MAX_PROMPT_CHARS = 2000;

export async function GET() {
  try {
    const authClient = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(authClient);

    const roles = await prisma.agentChatRole.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        prompt: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return jsonSuccess(roles);
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

export async function POST(request: Request) {
  try {
    const authClient = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(authClient);

    await requireRole(authClient, userId, ['OWNER'], tenantId);

    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : undefined;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!name) {
      return jsonError('VALIDATION_ERROR', 'O nome da role é obrigatório.', 400);
    }

    if (!prompt) {
      return jsonError('VALIDATION_ERROR', 'O prompt da role é obrigatório.', 400);
    }

    if (prompt.length > MAX_PROMPT_CHARS) {
      return jsonError('VALIDATION_ERROR', `O prompt deve ter no máximo ${MAX_PROMPT_CHARS} caracteres.`, 400);
    }

    const existingCount = await prisma.agentChatRole.count({
      where: { tenantId },
    });

    if (existingCount >= MAX_ROLES) {
      return jsonError('VALIDATION_ERROR', `Limite de ${MAX_ROLES} roles por organização atingido.`, 400);
    }

    const isFirstRole = existingCount === 0;

    const role = await prisma.agentChatRole.create({
      data: {
        tenantId,
        name,
        description: description || null,
        prompt,
        isDefault: isFirstRole,
      },
      select: {
        id: true,
        name: true,
        description: true,
        prompt: true,
        isDefault: true,
      },
    });

    return jsonSuccess(role, { status: 201 });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
