import type { Epic } from '@/shared/types';
import type { EpicRepository } from '@/infra/adapters/prisma';

export interface GetEpicsDeps {
  epicRepository: EpicRepository;
}

export async function getEpics(
  projectId: string,
  orgId: string,
  deps: GetEpicsDeps
): Promise<Epic[]> {
  const { epicRepository } = deps;
  return await epicRepository.findManyWithStats(projectId, orgId);
}
