import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { prisma } from '@/infra/adapters/prisma';

interface ActiveProject {
  id: string;
  name: string;
  key: string;
  taskCount: number;
  bugCount: number;
  blockedCount: number;
}

/**
 * GET /api/dashboard/active-projects
 * 
 * Retorna projetos onde o usuário tem tasks ativas (status != DONE).
 * Ordenados por quantidade de tasks.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Auth
    const supabase = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(supabase);

    // 2. Buscar tasks ativas agrupadas por projeto
    const tasks = await prisma.task.findMany({
      where: {
        orgId: tenantId,
        assigneeId: userId,
        status: { not: 'DONE' },
      },
      select: {
        projectId: true,
        type: true,
        blocked: true,
        project: {
          select: {
            id: true,
            name: true,
            key: true,
          },
        },
      },
    });

    // 3. Agrupar por projeto
    const projectMap = new Map<string, ActiveProject>();

    for (const task of tasks) {
      const existing = projectMap.get(task.projectId);
      
      if (existing) {
        existing.taskCount++;
        if (task.type === 'BUG') existing.bugCount++;
        if (task.blocked) existing.blockedCount++;
      } else {
        projectMap.set(task.projectId, {
          id: task.project.id,
          name: task.project.name,
          key: task.project.key,
          taskCount: 1,
          bugCount: task.type === 'BUG' ? 1 : 0,
          blockedCount: task.blocked ? 1 : 0,
        });
      }
    }

    // 4. Converter para array e ordenar por bugs > tasks
    const projects = Array.from(projectMap.values()).sort((a, b) => {
      // Projetos com bugs primeiro
      if (a.bugCount !== b.bugCount) return b.bugCount - a.bugCount;
      // Depois por quantidade de tasks
      return b.taskCount - a.taskCount;
    });

    return jsonSuccess({
      items: projects,
      total: projects.length,
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
