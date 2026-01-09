import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { prisma } from '@/infra/adapters/prisma';
import { getUserProjectIds } from '@/infra/adapters/prisma/project.helpers';
import { buildReadableId } from '@/shared/types/task.types';
import type { TaskWithReadableId, StoryPoints } from '@/shared/types';

/**
 * GET /api/dashboard/my-tasks
 * 
 * Retorna tasks ordenadas para ação:
 * 1. Bloqueadas primeiro
 * 2. Bugs
 * 3. Por prioridade (CRITICAL > HIGH > MEDIUM > LOW)
 * 4. Por última atualização
 * 
 * Query params:
 * - includeDone: inclui tasks DONE
 * - teamView: mostra tasks de TODOS os projetos (não apenas assigned ao user)
 * 
 * Exclui tasks DONE por padrão.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Auth
    const supabase = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(supabase);

    // 2. Query params
    const { searchParams } = new URL(request.url);
    const includeDone = searchParams.get('includeDone') === 'true';
    const teamView = searchParams.get('teamView') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // 3. Definir where clause baseado no modo
    let projectIds: string[] | undefined;
    
    if (teamView) {
      // Modo equipe: buscar projetos onde o usuário participa
      projectIds = await getUserProjectIds(tenantId, userId);
      
      if (projectIds.length === 0) {
        return jsonSuccess({ items: [], total: 0 });
      }
    }

    // 4. Query tasks com ordenação otimizada para "comando"
    const tasks = await prisma.task.findMany({
      where: {
        orgId: tenantId,
        ...(teamView && projectIds 
          ? { projectId: { in: projectIds } }
          : { assigneeId: userId }
        ),
        ...(includeDone ? {} : { status: { not: 'DONE' } }),
      },
      select: {
        id: true,
        orgId: true,
        projectId: true,
        featureId: true,
        localId: true,
        title: true,
        description: true,
        status: true,
        type: true,
        priority: true,
        points: true,
        modules: true,
        assigneeId: true,
        blocked: true,
        statusChangedAt: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: {
            id: true,
            key: true,
            name: true,
          },
        },
        feature: {
          select: {
            id: true,
            title: true,
            epic: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      take: limit,
      // Ordenação em SQL:
      // 1. blocked DESC (bloqueadas primeiro)
      // 2. type = BUG primeiro (via raw order)
      // 3. priority order
      // 4. updatedAt DESC
      orderBy: [
        { blocked: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    // 4. Ordenação final em memória para prioridade correta
    const priorityOrder: Record<string, number> = {
      CRITICAL: 1,
      HIGH: 2,
      MEDIUM: 3,
      LOW: 4,
    };

    const sortedTasks = [...tasks].sort((a, b) => {
      // Blocked primeiro
      if (a.blocked && !b.blocked) return -1;
      if (!a.blocked && b.blocked) return 1;

      // BUGs primeiro
      if (a.type === 'BUG' && b.type !== 'BUG') return -1;
      if (a.type !== 'BUG' && b.type === 'BUG') return 1;

      // Por prioridade
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Por última atualização
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    // 5. Formatar resposta
    const formattedTasks: TaskWithReadableId[] = sortedTasks.map((task) => ({
      ...task,
      points: task.points as StoryPoints,
      readableId: buildReadableId(task.project.key, task.localId),
      feature: {
        ...task.feature,
        epic: {
          ...task.feature.epic,
          project: task.project,
        },
      },
    }));

    return jsonSuccess({
      items: formattedTasks,
      total: formattedTasks.length,
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
