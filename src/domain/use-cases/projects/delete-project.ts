import type { ProjectRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/errors';

export interface DeleteProjectDeps {
  projectRepository: ProjectRepository;
}

/**
 * Delete Project Use Case
 * 
 * ⚠️ CASCADE DELETE:
 * - All epics in project
 * - All features in those epics
 * - All tasks in those features
 * - All comments, poker sessions, etc
 * 
 * This is a DESTRUCTIVE operation.
 */
export async function deleteProject(
  id: string,
  orgId: string,
  deps: DeleteProjectDeps
): Promise<void> {
  const { projectRepository } = deps;

  // 1. Delete (returns false if not found or different org)
  const deleted = await projectRepository.delete(id, orgId);
  
  if (!deleted) {
    throw new NotFoundError('Projeto', id);
  }

  // 2. Future: Invalidate caches, send notifications, etc
}
