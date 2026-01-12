import type { Project } from '@/shared/types';
import type { ProjectRepository } from '@/infra/adapters/prisma';

export interface GetProjectsDeps {
  projectRepository: ProjectRepository;
}

/**
 * Get Projects Use Case
 * 
 * Returns all projects in organization
 * Ordered by creation date (newest first)
 */
export async function getProjects(
  orgId: string,
  deps: GetProjectsDeps
): Promise<any[]> {
  const { projectRepository } = deps;

  return await projectRepository.findManyWithAnalytics(orgId);
}
