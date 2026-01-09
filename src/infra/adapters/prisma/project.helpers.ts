import { prisma } from './index';

/**
 * getUserProjectIds - Busca IDs dos projetos onde o usuário participa
 * 
 * Um usuário "participa" de um projeto se:
 * - É assignee de alguma task do projeto
 * - Criou alguma task do projeto
 * 
 * Usado para calcular "zona de influência" na dashboard.
 */
export async function getUserProjectIds(
  orgId: string,
  userId: string
): Promise<string[]> {
  const projects = await prisma.task.findMany({
    where: {
      orgId,
      OR: [
        { assigneeId: userId },
        { createdBy: userId },
      ],
    },
    select: { projectId: true },
    distinct: ['projectId'],
  });

  return projects.map((p) => p.projectId);
}
