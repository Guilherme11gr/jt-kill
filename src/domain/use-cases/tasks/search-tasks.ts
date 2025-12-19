import type { TaskWithReadableId, TaskFilterParams } from '@/shared/types';
import type { TaskRepository } from '@/infra/adapters/prisma';

export interface SearchTasksDeps {
  taskRepository: TaskRepository;
}

export interface SearchTasksResult {
  items: TaskWithReadableId[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Search Tasks Use Case
 * 
 * Retorna tasks com pagination + total count
 */
export async function searchTasks(
  orgId: string,
  filters: TaskFilterParams,
  deps: SearchTasksDeps
): Promise<SearchTasksResult> {
  const { taskRepository } = deps;
  const { page = 1, pageSize = 20 } = filters;

  // Executa em paralelo para performance
  const [items, total] = await Promise.all([
    taskRepository.findMany(orgId, filters),
    taskRepository.count(orgId, filters),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
