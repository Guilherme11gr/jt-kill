import type { FeatureRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/errors';

export interface DeleteFeatureDeps {
  featureRepository: FeatureRepository;
}

/**
 * ⚠️ CASCADE: Tasks dentro da Feature serão deletadas
 */
export async function deleteFeature(
  id: string,
  orgId: string,
  deps: DeleteFeatureDeps
): Promise<void> {
  const { featureRepository } = deps;

  const deleted = await featureRepository.delete(id, orgId);
  
  if (!deleted) {
    throw new NotFoundError('Feature', id);
  }
}
