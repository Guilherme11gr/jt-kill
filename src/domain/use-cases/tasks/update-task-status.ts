import type { Task, TaskStatus } from '@/shared/types';
import type { TaskRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/errors';

export interface UpdateTaskStatusDeps {
  taskRepository: TaskRepository;
}

/**
 * Update Task Status Use Case
 * 
 * Para MVP, não valida transições de workflow
 * Aceita qualquer mudança de status
 */
export async function updateTaskStatus(
  id: string,
  orgId: string,
  newStatus: TaskStatus,
  deps: UpdateTaskStatusDeps
): Promise<Task> {
  const { taskRepository } = deps;

  const task = await taskRepository.findById(id, orgId);
  if (!task) {
    throw new NotFoundError('Task', id);
  }

  return await taskRepository.updateStatus(id, orgId, newStatus);
}
