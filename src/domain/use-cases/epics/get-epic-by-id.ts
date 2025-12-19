import type { Epic } from '@/shared/types';
import type { EpicRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/errors';

export interface GetEpicByIdDeps {
  epicRepository: EpicRepository;
}

export async function getEpicById(
  id: string,
  orgId: string,
  deps: GetEpicByIdDeps
): Promise<Epic> {
  const { epicRepository } = deps;

  const epic = await epicRepository.findById(id, orgId);

  if (!epic) {
    throw new NotFoundError('Epic', id);
  }

  return epic;
}
