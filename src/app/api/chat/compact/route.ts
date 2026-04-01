import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const globalForCompact = globalThis as unknown as { compactPool?: Pool };

function getCompactPool(): Pool {
  if (!globalForCompact.compactPool) {
    globalForCompact.compactPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return globalForCompact.compactPool;
}

type Message = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
};

/**
 * POST /api/chat/compact - Summarize old messages in agent chat session
 *
 * Keeps the last N messages intact and summarizes older ones into a single
 * system message, reducing token usage while preserving recent context.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenantId, userId } = await extractAuthenticatedTenant(supabase);

    const body = await request.json();
    const { sessionId, keepLast = 12 } = body as { sessionId?: string; keepLast?: number };

    if (!sessionId || typeof sessionId !== 'string') {
      return jsonError('VALIDATION_ERROR', 'sessionId é obrigatório', 400);
    }

    if (typeof keepLast !== 'number' || keepLast < 2 || keepLast > 48) {
      return jsonError('VALIDATION_ERROR', 'keepLast deve ser entre 2 e 48', 400);
    }

    const pool = getCompactPool();

    // Fetch current messages
    const result = await pool.query<{ messages: Message[] }>(
      'SELECT messages FROM public.agent_sessions WHERE id = $1',
      [sessionId]
    );

    const currentMessages = result.rows[0]?.messages ?? [];
    if (currentMessages.length <= keepLast) {
      return jsonSuccess({
        compacted: false,
        messageCount: currentMessages.length,
        reason: `Sessão já tem ${currentMessages.length} mensagens (<= ${keepLast}), nada a compactar.`,
      });
    }

    const oldMessages = currentMessages.slice(0, -keepLast);
    const recentMessages = currentMessages.slice(-keepLast);

    // Build a summary of old messages
    const userMsgCount = oldMessages.filter(m => m.role === 'user').length;
    const assistantMsgCount = oldMessages.filter(m => m.role === 'assistant').length;
    const toolMsgCount = oldMessages.filter(m => m.role === 'tool').length;

    // Extract key topics from user messages (first 50 chars each)
    const topics = oldMessages
      .filter(m => m.role === 'user' && m.content)
      .map(m => m.content!.slice(0, 80))
      .slice(-10); // Last 10 user messages as topics

    const summaryMessage: Message = {
      role: 'system',
      content: [
        `[Contexto compactado - ${oldMessages.length} mensagens resumidas]`,
        `Conversa anterior continha: ${userMsgCount} perguntas do usuário, ${assistantMsgCount} respostas do assistente, ${toolMsgCount} chamadas de ferramentas.`,
        `Tópicos discutidos anteriormente:`,
        ...topics.map(t => `  - ${t}`),
        `[Fim do contexto compactado]`,
      ].join('\n'),
    };

    const compactedMessages = [summaryMessage, ...recentMessages];

    // Update session
    await pool.query(
      `UPDATE public.agent_sessions SET messages = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(compactedMessages), sessionId]
    );

    return jsonSuccess({
      compacted: true,
      before: currentMessages.length,
      after: compactedMessages.length,
      removed: oldMessages.length,
      kept: keepLast,
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * DELETE /api/chat/sessions - Cleanup old agent chat sessions
 *
 * Removes sessions not updated in the last N days (default 30).
 * Only org owners can run this.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenantId, userId, memberships } = await extractAuthenticatedTenant(supabase);

    // Only owners can cleanup
    const membership = memberships.find(m => m.orgId === tenantId);
    if (!membership || membership.role !== 'OWNER') {
      return jsonError('FORBIDDEN', 'Apenas owners podem limpar sessões antigas', 403);
    }

    const { searchParams } = new URL(request.url);
    const olderThanDays = parseInt(searchParams.get('days') || '30', 10);

    if (isNaN(olderThanDays) || olderThanDays < 1 || olderThanDays > 365) {
      return jsonError('VALIDATION_ERROR', 'days deve ser entre 1 e 365', 400);
    }

    const pool = getCompactPool();

    const result = await pool.query(
      `DELETE FROM public.agent_sessions
       WHERE updated_at < NOW() - INTERVAL '1 day' * $1
       RETURNING id`,
      [olderThanDays]
    );

    return jsonSuccess({
      deleted: result.rowCount ?? 0,
      olderThanDays,
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
