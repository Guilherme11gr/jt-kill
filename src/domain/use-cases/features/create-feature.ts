import type { Feature } from '@/shared/types';
import type { FeatureRepository } from '@/infra/adapters/prisma';

export interface CreateFeatureInput {
  orgId: string;
  epicId: string;
  title: string;
  description?: string | null;
}

export interface CreateFeatureDeps {
  featureRepository: FeatureRepository;
}

export async function createFeature(
  input: CreateFeatureInput,
  deps: CreateFeatureDeps
): Promise<Feature> {
  const { featureRepository } = deps;
  return await featureRepository.create(input);
}
