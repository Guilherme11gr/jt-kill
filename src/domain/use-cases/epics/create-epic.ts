import type { Epic } from '@/shared/types';
import type { EpicRepository } from '@/infra/adapters/prisma';

export interface CreateEpicInput {
  orgId: string;
  projectId: string;
  title: string;
  description?: string | null;
}

export interface CreateEpicDeps {
  epicRepository: EpicRepository;
}

export async function createEpic(
  input: CreateEpicInput,
  deps: CreateEpicDeps
): Promise<Epic> {
  const { epicRepository } = deps;
  return await epicRepository.create(input);
}
