import type { TaskRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/errors';

export interface DeleteTaskDeps {
  taskRepository: TaskRepository;
}

export async function deleteTask(
  id: string,
  orgId: string,
  deps: DeleteTaskDeps
): Promise<void> {
  const { taskRepository } = deps;

  const deleted = await taskRepository.delete(id, orgId);
  
  if (!deleted) {
    throw new NotFoundError('Task', id);
  }
}
