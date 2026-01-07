import type { Task, TaskStatus, TaskType, TaskPriority, StoryPoints } from '@/shared/types';
import type { TaskRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/errors';

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
  points?: StoryPoints | null;
  modules?: string[];
  assigneeId?: string | null;
  blocked?: boolean;
}

export interface UpdateTaskDeps {
  taskRepository: TaskRepository;
}

export async function updateTask(
  id: string,
  orgId: string,
  input: UpdateTaskInput,
  deps: UpdateTaskDeps
): Promise<Task> {
  const { taskRepository } = deps;

  const existing = await taskRepository.findById(id, orgId);
  if (!existing) {
    throw new NotFoundError('Task', id);
  }

  return await taskRepository.update(id, orgId, input);
}
