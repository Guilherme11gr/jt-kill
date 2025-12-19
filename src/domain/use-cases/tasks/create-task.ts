import type { Task, TaskType, TaskPriority, StoryPoints } from '@/shared/types';
import type { TaskRepository } from '@/infra/adapters/prisma';

export interface CreateTaskInput {
  orgId: string;
  featureId: string;
  title: string;
  description?: string | null;
  type?: TaskType;
  priority?: TaskPriority;
  points?: StoryPoints | null;
  module?: string | null;
  assigneeId?: string | null;
}

export interface CreateTaskDeps {
  taskRepository: TaskRepository;
}

/**
 * Create Task Use Case
 * 
 * - local_id é gerado automaticamente pelo trigger do DB
 * - project_id é propagado automaticamente pelo trigger
 */
export async function createTask(
  input: CreateTaskInput,
  deps: CreateTaskDeps
): Promise<Task> {
  const { taskRepository } = deps;
  return await taskRepository.create(input);
}
