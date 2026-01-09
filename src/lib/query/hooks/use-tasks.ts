import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { invalidateDashboardQueries } from '../helpers';
import { queryKeys } from '../query-keys';
import { CACHE_TIMES } from '../cache-config';
import type { TaskWithReadableId, TaskStatus } from '@/shared/types';
import type { TaskFiltersState } from '@/components/features/tasks';
import { toast } from 'sonner';

// ============ Types ============

export interface TasksResponse {
  items: TaskWithReadableId[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface CreateTaskInput {
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  featureId: string;
  points: number | string | null;
  module?: string | null;
  modules?: string[];
  assigneeId?: string | null;
  projectId?: string;
}

interface UpdateTaskInput {
  id: string;
  data: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: string;
    type: string;
    points: number | null;
    module: string | null;
    modules: string[];
    featureId: string;
    assigneeId: string | null;
    blocked: boolean;
  }>;
}

// ============ Fetch Functions ============

/**
 * Fetch tasks from API with server-side filtering
 * 
 * IMPORTANT: All filtering happens on the server for accuracy.
 * The 'me' assigneeId must be resolved to actual userId before calling.
 */
async function fetchTasks(filters?: Partial<TaskFiltersState>): Promise<TasksResponse> {
  const params = new URLSearchParams();
  
  // Optimized for Kanban: fetch enough tasks, skip expensive count
  params.set('pageSize', '100');
  params.set('sortBy', 'createdAt');
  params.set('sortOrder', 'desc');
  params.set('skipCount', 'true'); // Signal to API to skip count query

  // Add filters to params (skip 'all' and empty values)
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      // Skip 'all', 'me' (handled by caller), empty strings, and undefined
      if (value && value !== 'all' && value !== 'me' && value !== '') {
        params.set(key, String(value));
      }
    });
  }

  const res = await fetch(`/api/tasks?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  const json = await res.json();
  return json.data;
}

async function createTask(data: CreateTaskInput): Promise<TaskWithReadableId> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create task');
  const json = await res.json();
  return json.data;
}

async function updateTask({ id, data }: UpdateTaskInput): Promise<TaskWithReadableId> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update task');
  const json = await res.json();
  return json.data;
}

async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete task');
}

// ============ Hooks ============

interface UseTasksOptions {
  filters?: Partial<TaskFiltersState>;
  /** Current user ID - required to resolve 'me' filter */
  currentUserId?: string;
}

/**
 * Fetch tasks with server-side filtering
 * 
 * IMPORTANT: Filters are sent to the API, not applied client-side.
 * This ensures accurate results even with >100 tasks.
 * 
 * @example
 * const { data, isLoading } = useTasks({ 
 *   filters: { status: 'DOING', assigneeId: 'me' },
 *   currentUserId: user.id 
 * });
 */
export function useTasks(options: UseTasksOptions = {}) {
  const { filters, currentUserId } = options;
  
  // Resolve 'me' to actual userId for server-side filtering
  const resolvedFilters = filters ? {
    ...filters,
    // Convert 'me' to actual UUID, or undefined if user not loaded
    assigneeId: filters.assigneeId === 'me' 
      ? currentUserId 
      : filters.assigneeId,
  } : undefined;

  return useQuery({
    queryKey: queryKeys.tasks.list(resolvedFilters),
    queryFn: () => fetchTasks(resolvedFilters),
    // Don't fetch if 'me' filter is set but user isn't loaded yet
    enabled: !(filters?.assigneeId === 'me' && !currentUserId),
    // Keep previous data visible while fetching new filter results
    // This prevents the UI from showing skeleton on every filter change
    placeholderData: keepPreviousData,
    // Cache tasks for 30s to avoid refetch on filter toggle (e.g., project switch)
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create a new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: (newTask) => {
      // 1. Update the lists (Optimistic-ish)
      // We append to any list that might contain this task. 
      // Since filtering is complex, we'll try to add it to the 'all' list or just invalidate if filtering is strict.
      // But for the main board, adding it to the list is usually enough.

      // 2. Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });

      // 3. Invalidate Dashboard using helper
      invalidateDashboardQueries(queryClient);

      toast.success('Task criada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar task');
    },
  });
}

/**
 * Update a task
 * Automatically invalidates task list cache on success.
 * 
 * @example
 * const { mutate } = useUpdateTask();
 * mutate({ id: 'uuid', data: { status: 'DONE' } });
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onSuccess: (updatedTask) => {
      // 1. Optimistic update: update task in all lists immediately
      queryClient.setQueriesData<TasksResponse>(
        { queryKey: queryKeys.tasks.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((task) =>
              task.id === updatedTask.id ? updatedTask : task
            ),
          };
        }
      );

      // 2. Update feature detail if task belongs to a feature (for count updates)
      if (updatedTask.featureId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.features.detail(updatedTask.featureId),
        });
      }

      // 3. Invalidate all task lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });

      // 4. Invalidate Dashboard using helper
      invalidateDashboardQueries(queryClient);

      toast.success('Task atualizada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar task');
      console.error('Update task error:', error);
    },
  });
}

/**
 * Delete a task
 * Automatically invalidates task list cache on success.
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });

      // Invalidate Dashboard using helper
      invalidateDashboardQueries(queryClient);

      toast.success('Task excluída');
    },
    onError: (error) => {
      toast.error('Erro ao excluir task');
      console.error('Delete task error:', error);
    },
  });
}

/**
 * Move task to new status (optimistic update)
 * Updates UI immediately, reverts on error.
 * Uses dedicated /status endpoint to ensure only status is changed.
 */
export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const res = await fetch(`/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to move task');
      const json = await res.json();
      return json.data as TaskWithReadableId;
    },

    // Optimistic update
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() });

      // Snapshot previous value
      const previousTasks = queryClient.getQueriesData({ queryKey: queryKeys.tasks.lists() });

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: queryKeys.tasks.lists() },
        (old: TasksResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((task) =>
              task.id === id ? { ...task, status } : task
            ),
          };
        }
      );

      return { previousTasks };
    },

    onError: (_err, _vars, context) => {
      // Revert on error
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Erro ao mover task');
    },

    onSettled: () => {
      // Refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });

      // Invalidate Dashboard using helper
      invalidateDashboardQueries(queryClient);
    },
  });
}
