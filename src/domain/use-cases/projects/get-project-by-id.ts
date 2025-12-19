import type { Project } from '@/shared/types';
import type { ProjectRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/errors';

export interface GetProjectByIdDeps {
  projectRepository: ProjectRepository;
}

/**
 * Get Project By ID Use Case
 * 
 * @throws NotFoundError if project not found or not in user's org
 */
export async function getProjectById(
  id: string,
  orgId: string,
  deps: GetProjectByIdDeps
): Promise<Project> {
  const { projectRepository } = deps;

  const project = await projectRepository.findById(id, orgId);

  if (!project) {
    throw new NotFoundError('Projeto', id);
  }

  return project;
}
