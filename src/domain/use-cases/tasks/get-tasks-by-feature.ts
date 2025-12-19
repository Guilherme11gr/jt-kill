import type { TaskWithReadableId } from '@/shared/types';
import type { TaskRepository } from '@/infra/adapters/prisma';

export interface GetTasksByFeatureDeps {
  taskRepository: TaskRepository;
}

export async function getTasksByFeature(
  featureId: string,
  orgId: string,
  deps: GetTasksByFeatureDeps
): Promise<TaskWithReadableId[]> {
  const { taskRepository } = deps;
  return await taskRepository.findMany(orgId, { featureId });
}
