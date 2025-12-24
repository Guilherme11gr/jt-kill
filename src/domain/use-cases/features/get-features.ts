import type { Feature } from '@/shared/types';
import type { FeatureRepository } from '@/infra/adapters/prisma';

export interface GetFeaturesDeps {
  featureRepository: FeatureRepository;
}

export async function getFeatures(
  epicId: string,
  orgId: string,
  deps: GetFeaturesDeps
): Promise<Array<Feature & { _count: { tasks: number }; tasks: Array<{ status: string; type: string }> }>> {
  const { featureRepository } = deps;
  return await featureRepository.findManyWithStats(epicId, orgId);
}
