import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { prisma } from '@/infra/adapters/prisma';

type HealthStatus = 'healthy' | 'attention' | 'critical';

interface ProjectHealth {
  status: HealthStatus;
  stagnatedTasks: number;      // Tasks sem update há >7 dias
  oldBlockedTasks: number;      // Bloqueadas há >3 dias
  unassignedCritical: number;   // Tasks críticas sem dono
}

interface ActiveProject {
  id: string;
  name: string;
  key: string;
  taskCount: number;
  bugCount: number;
  blockedCount: number;
  health: ProjectHealth;
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
        priority: true,
        assigneeId: true,
        updatedAt: true,
        statusChangedAt: true,
        project: {
          select: {
            id: true,
            name: true,
            key: true,
          },
        },
      },
    });

    // 3. Agrupar por projeto e calcular health
    const projectMap = new Map<string, ActiveProject>();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    for (const task of tasks) {
      const existing = projectMap.get(task.projectId);
      
      // Calcular health metrics
      const isStagnated = task.updatedAt < sevenDaysAgo;
      const isOldBlocked = task.blocked && (task.statusChangedAt ? task.statusChangedAt < threeDaysAgo : true);
      const isUnassignedCritical = task.priority === 'CRITICAL' && !task.assigneeId;
      
      if (existing) {
        existing.taskCount++;
        if (task.type === 'BUG') existing.bugCount++;
        if (task.blocked) existing.blockedCount++;
        
        // Update health metrics
        if (isStagnated) existing.health.stagnatedTasks++;
        if (isOldBlocked) existing.health.oldBlockedTasks++;
        if (isUnassignedCritical) existing.health.unassignedCritical++;
      } else {
        projectMap.set(task.projectId, {
          id: task.project.id,
          name: task.project.name,
          key: task.project.key,
          taskCount: 1,
          bugCount: task.type === 'BUG' ? 1 : 0,
          blockedCount: task.blocked ? 1 : 0,
          health: {
            status: 'healthy', // Will be calculated below
            stagnatedTasks: isStagnated ? 1 : 0,
            oldBlockedTasks: isOldBlocked ? 1 : 0,
            unassignedCritical: isUnassignedCritical ? 1 : 0,
          },
        });
      }
    }

    // Calculate health status for each project
    for (const project of projectMap.values()) {
      const totalIssues = 
        project.health.stagnatedTasks + 
        project.health.oldBlockedTasks + 
        project.health.unassignedCritical;
      
      // Critical: 3+ issues OR old blocked > 7 days
      if (totalIssues >= 3 || project.health.oldBlockedTasks >= 2) {
        project.health.status = 'critical';
      } else if (totalIssues >= 1) {
        project.health.status = 'attention';
      } else {
        project.health.status = 'healthy';
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
