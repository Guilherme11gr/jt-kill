import { NextRequest } from 'next/server';
import { createAgentRoute } from '@guilherme/agent-sdk/next';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonError } from '@/shared/http/responses';
import { userProfileRepository, prisma } from '@/infra/adapters/prisma';
import { buildAgentChatSystemPrompt, buildAgentChatTools } from '@/lib/agent-chat/tools';
import {
  AGENT_CHAT_HEADER_NAMES,
  encodeAgentChatHeader,
  getAgentChatContextFromHeaders,
} from '@/lib/agent-chat/internal-api';
import { getAgentChatProviderConfig } from '@/lib/agent-chat/provider';
import { getAgentChatHistoryStore } from '@/lib/agent-chat/history-store';
import {
  createAgentChatErrorResponse,
  namespaceAgentChatSessionId,
  normalizeAgentChatSessionId,
  resolveAgentChatInternalOrigin,
} from '@/lib/agent-chat/route-helpers';
import { checkRateLimit } from '@/lib/agent-chat/rate-limit';

export const dynamic = 'force-dynamic';

const agentHandler = createAgentRoute({
  provider: () => getAgentChatProviderConfig(),
  historyStore: () => getAgentChatHistoryStore() as any,
  systemPrompt: ({ req }) => buildAgentChatSystemPrompt(getAgentChatContextFromHeaders(req.headers)),
  tools: ({ req }) => buildAgentChatTools(getAgentChatContextFromHeaders(req.headers)),
  historySize: 24,
  temperature: 0.25,
  maxIterations: 8,
  toolExecutionTimeout: 15_000,
  promptEnhancer: {
    timezone: 'America/Sao_Paulo',
    locale: 'pt-BR',
  },
});

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { userId, tenantId, memberships } = await extractAuthenticatedTenant(authClient);

    // Rate limit: 1 request per user per second
    const rateLimitKey = `${tenantId}:${userId}`;
    const rateCheck = checkRateLimit(rateLimitKey, { maxRequests: 1, windowMs: 1000 });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: { code: 'RATE_LIMITED', message: 'Muitas requisições. Aguarde um momento.' },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((rateCheck.retryAfterMs || 1000) / 1000)),
          },
        }
      );
    }

    const profile = await userProfileRepository.findByIdGlobal(userId);
    const currentMembership =
      memberships.find((membership) => membership.orgId === tenantId) || memberships[0];

    const body = (await request.json()) as Record<string, unknown>;
    const rawSessionId = normalizeAgentChatSessionId(body.sessionId);

    if (!rawSessionId) {
      return jsonError('VALIDATION_ERROR', 'sessionId é obrigatório e deve ser curto', 400);
    }

    const rewrittenHeaders = new Headers(request.headers);
    rewrittenHeaders.set('content-type', 'application/json');
    rewrittenHeaders.set(
      AGENT_CHAT_HEADER_NAMES.tenantId,
      encodeAgentChatHeader(tenantId)
    );
    rewrittenHeaders.set(
      AGENT_CHAT_HEADER_NAMES.userId,
      encodeAgentChatHeader(userId)
    );
    rewrittenHeaders.set(
      AGENT_CHAT_HEADER_NAMES.role,
      encodeAgentChatHeader(currentMembership?.role || 'MEMBER')
    );
    rewrittenHeaders.set(
      AGENT_CHAT_HEADER_NAMES.orgName,
      encodeAgentChatHeader(currentMembership?.orgName || '')
    );
    rewrittenHeaders.set(
      AGENT_CHAT_HEADER_NAMES.orgSlug,
      encodeAgentChatHeader(currentMembership?.orgSlug || '')
    );
    rewrittenHeaders.set(
      AGENT_CHAT_HEADER_NAMES.userDisplayName,
      encodeAgentChatHeader(profile?.displayName || '')
    );
    rewrittenHeaders.set(
      AGENT_CHAT_HEADER_NAMES.origin,
      encodeAgentChatHeader(resolveAgentChatInternalOrigin(request.nextUrl.origin))
    );

    // Fetch user's selected role, fallback to org default
    // Priority: custom prompt > selected role > org default
    const membership = await prisma.orgMembership.findUnique({
      where: { userId_orgId: { userId, orgId: tenantId } },
      select: {
        customAgentRolePrompt: true,
        agentChatRole: { select: { prompt: true } },
      },
    });

    let rolePrompt: string | null = membership?.customAgentRolePrompt || null;
    if (!rolePrompt && membership?.agentChatRole?.prompt) {
      rolePrompt = membership.agentChatRole.prompt;
    }
    if (!rolePrompt) {
      const defaultRole = await prisma.agentChatRole.findFirst({
        where: { tenantId, isDefault: true },
        select: { prompt: true },
      });
      rolePrompt = defaultRole?.prompt || null;
    }

    rewrittenHeaders.set(
      AGENT_CHAT_HEADER_NAMES.agentRolePrompt,
      encodeAgentChatHeader(rolePrompt || '')
    );

    const rewrittenBody = JSON.stringify({
      ...body,
      sessionId: namespaceAgentChatSessionId(rawSessionId, tenantId, userId),
    });

    const rewrittenRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: rewrittenHeaders,
      body: rewrittenBody,
    });

    return agentHandler(rewrittenRequest);
  } catch (error) {
    return createAgentChatErrorResponse(error);
  }
}
