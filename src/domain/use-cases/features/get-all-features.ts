import type { Feature } from '@/shared/types';
import type { FeatureRepository } from '@/infra/adapters/prisma';

export interface GetAllFeaturesDeps {
  featureRepository: FeatureRepository;
}

export async function getAllFeatures(
  orgId: string,
  deps: GetAllFeaturesDeps
): Promise<Feature[]> {
  const { featureRepository } = deps;
  return await featureRepository.findAll(orgId);
}
