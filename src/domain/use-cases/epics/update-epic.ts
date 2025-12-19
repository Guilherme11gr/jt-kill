import type { Epic, EpicStatus } from '@/shared/types';
import type { EpicRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/errors';

export interface UpdateEpicInput {
  title?: string;
  description?: string | null;
  status?: EpicStatus;
}

export interface UpdateEpicDeps {
  epicRepository: EpicRepository;
}

export async function updateEpic(
  id: string,
  orgId: string,
  input: UpdateEpicInput,
  deps: UpdateEpicDeps
): Promise<Epic> {
  const { epicRepository } = deps;

  // 1. Check epic exists
  const existing = await epicRepository.findById(id, orgId);
  if (!existing) {
    throw new NotFoundError('Epic', id);
  }

  // 2. Update
  return await epicRepository.update(id, orgId, input);
}
