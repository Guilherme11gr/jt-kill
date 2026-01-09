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

    // 4. Buscar TODAS as tasks desses projetos (não só as do usuário)
    const projectTasks = await prisma.task.findMany({
      where: {
        orgId: tenantId,
        projectId: { in: projectIds },
      },
      select: { id: true },
    });

    const taskIds = projectTasks.map((t) => t.id);

    if (taskIds.length === 0) {
      return jsonSuccess({ items: [], total: 0 });
    }

    // 5. Buscar audit logs recentes de TODAS as tasks dos projetos
    // Mostra atividade de equipe, não apenas das minhas tasks
    const logs = await prisma.auditLog.findMany({
      where: {
        orgId: tenantId,
        createdAt: { gte: since },
        targetType: 'task',
        targetId: { in: taskIds },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // 6. Buscar nomes dos usuários e títulos das tasks
    const userIds = [...new Set(logs.map((l) => l.userId))];
    const logTaskIds = [...new Set(logs.filter((l) => l.targetId).map((l) => l.targetId!))];

    const [users, tasks] = await Promise.all([
      prisma.userProfile.findMany({
        where: { id: { in: userIds } },
        select: { id: true, displayName: true },
      }),
      prisma.task.findMany({
        where: { id: { in: taskIds } },
        select: {
          id: true,
          title: true,
          localId: true,
          project: { select: { key: true } },
        },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u.displayName]));
    const taskMap = new Map(tasks.map((t) => [t.id, {
      title: t.title,
      readableId: `${t.project.key}-${t.localId}`,
    }]));

    // 6. Formatar atividades com mensagem humana
    const items: ActivityItem[] = logs.map((log) => {
      const actorName = userMap.get(log.userId) || 'Alguém';
      const taskInfo = log.targetId ? taskMap.get(log.targetId) : null;
      const metadata = log.metadata as Record<string, unknown> | null;

      const humanMessage = formatHumanMessage(
        log.action,
        actorName,
        taskInfo?.readableId || null,
        metadata
      );

      return {
        id: log.id,
        action: log.action,
        actorId: log.userId,
        actorName,
        targetType: log.targetType,
        targetId: log.targetId,
        targetTitle: taskInfo?.title || null,
        targetReadableId: taskInfo?.readableId || null,
        metadata,
        createdAt: log.createdAt,
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
