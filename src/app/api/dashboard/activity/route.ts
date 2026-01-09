import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { prisma } from '@/infra/adapters/prisma';
import { getUserProjectIds } from '@/infra/adapters/prisma/project.helpers';

interface ActivityItem {
  id: string;
  action: string;
  actorId: string;
  actorName: string | null;
  targetType: string | null;
  targetId: string | null;
  targetTitle: string | null;
  targetReadableId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  humanMessage: string;
}

/**
 * GET /api/dashboard/activity
 * 
 * Retorna atividades recentes dos PROJETOS onde o usuário participa.
 * Mostra consciência de equipe - não apenas ações nas tasks do usuário.
 * 
 * OPTIMIZED: Uses single raw SQL query with JOINs instead of multiple Prisma queries
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Auth
    const supabase = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(supabase);

    // 2. Query params
    const { searchParams } = new URL(request.url);
    const hours = Math.min(parseInt(searchParams.get('hours') || '24'), 72);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const since = new Date();
    since.setHours(since.getHours() - hours);

    // 3. Buscar projetos onde o usuário participa (assignee ou criou tasks)
    const projectIds = await getUserProjectIds(tenantId, userId);

    if (projectIds.length === 0) {
      return jsonSuccess({ items: [], total: 0 });
    }

    // 4. OPTIMIZED: Single raw SQL query with JOINs
    // Gets audit logs + user names + task details in one query
    interface AuditLogRow {
      id: string;
      user_id: string;
      action: string;
      target_type: string | null;
      target_id: string | null;
      metadata: Record<string, unknown> | null;
      created_at: Date;
      display_name: string | null;
      task_title: string | null;
      task_local_id: number | null;
      project_key: string | null;
    }

    const logs = await prisma.$queryRaw<AuditLogRow[]>`
      SELECT 
        a.id,
        a.user_id,
        a.action,
        a.target_type,
        a.target_id,
        a.metadata,
        a.created_at,
        u.display_name,
        t.title as task_title,
        t.local_id as task_local_id,
        p.key as project_key
      FROM public.audit_logs a
      LEFT JOIN public.user_profiles u ON a.user_id = u.id AND u.org_id = ${tenantId}::uuid
      LEFT JOIN public.tasks t ON a.target_id = t.id
      LEFT JOIN public.projects p ON t.project_id = p.id
      WHERE a.org_id = ${tenantId}::uuid
        AND a.created_at >= ${since}
        AND a.target_type = 'task'
        AND a.target_id IN (
          SELECT id FROM public.tasks 
          WHERE org_id = ${tenantId}::uuid 
            AND project_id = ANY(${projectIds}::uuid[])
        )
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `;

    if (logs.length === 0) {
      return jsonSuccess({ items: [], total: 0 });
    }

    // 5. Format activities with human messages
    const items: ActivityItem[] = logs.map((log) => {
      const actorName = log.display_name || 'Alguém';
      const readableId = log.project_key && log.task_local_id
        ? `${log.project_key}-${log.task_local_id}`
        : null;

      const humanMessage = formatHumanMessage(
        log.action,
        actorName,
        readableId,
        log.metadata
      );

      return {
        id: log.id,
        action: log.action,
        actorId: log.user_id,
        actorName,
        targetType: log.target_type,
        targetId: log.target_id,
        targetTitle: log.task_title || null,
        targetReadableId: readableId,
        metadata: log.metadata,
        createdAt: log.created_at,
        humanMessage,
      };
    });

    return jsonSuccess({
      items,
      total: items.length,
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

/**
 * Formata mensagem humana para cada tipo de ação
 */
function formatHumanMessage(
  action: string,
  actorName: string | null,
  taskId: string | null,
  metadata: Record<string, unknown> | null
): string {
  const actor = actorName || 'Alguém';
  const task = taskId || 'uma task';

  switch (action) {
    case 'task.status.changed': {
      const from = metadata?.fromStatus as string | undefined;
      const to = metadata?.toStatus as string | undefined;
      if (to) {
        return `${actor} moveu ${task} para ${formatStatus(to)}`;
      }
      return `${actor} alterou o status de ${task}`;
    }

    case 'task.assigned': {
      const assigneeName = metadata?.assigneeName as string | undefined;
      if (assigneeName) {
        return `${actor} atribuiu ${task} para ${assigneeName}`;
      }
      return `${actor} alterou o responsável de ${task}`;
    }

    case 'task.created':
      return `${actor} criou ${task}`;

    case 'task.deleted':
      return `${actor} excluiu ${task}`;

    case 'comment.created':
      return `${actor} comentou em ${task}`;

    case 'task.blocked':
      return `${actor} marcou ${task} como bloqueada`;

    case 'task.unblocked':
      return `${actor} desbloqueou ${task}`;

    default:
      return `${actor} atualizou ${task}`;
  }
}

/**
 * Formata status para português
 */
function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    BACKLOG: 'Backlog',
    TODO: 'A Fazer',
    DOING: 'Em Andamento',
    REVIEW: 'Em Revisão',
    QA_READY: 'QA',
    DONE: 'Concluído',
  };
  return labels[status] || status;
}
