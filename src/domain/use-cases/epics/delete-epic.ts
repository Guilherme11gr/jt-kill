import type { EpicRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/errors';

export interface DeleteEpicDeps {
  epicRepository: EpicRepository;
}

/**
 * Delete Epic Use Case
 * 
 * ⚠️ CASCADE DELETE: Features e Tasks dentro do Epic serão deletados
 */
export async function deleteEpic(
  id: string,
  orgId: string,
  deps: DeleteEpicDeps
): Promise<void> {
  const { epicRepository } = deps;

  const deleted = await epicRepository.delete(id, orgId);
  
  if (!deleted) {
    throw new NotFoundError('Epic', id);
  }
}
