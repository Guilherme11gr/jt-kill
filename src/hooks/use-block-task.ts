import { useUpdateTask } from '@/lib/query/hooks/use-tasks';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/query-keys';
import { toast } from 'sonner';
import type { TasksResponse } from '@/lib/query/hooks/use-tasks';

interface UseBlockTaskOptions {
  onSuccess?: (blocked: boolean) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook para bloquear/desbloquear tasks com optimistic updates
 * Implementa snapshot e rollback para UX fluida
 * 
 * @example
 * const { toggleBlocked, isPending } = useBlockTask(taskId);
 * 
 * <Checkbox
 *   checked={task.blocked}
 *   disabled={isPending}
 *   onCheckedChange={toggleBlocked}
 * />
 */
export function useBlockTask(taskId: string, options?: UseBlockTaskOptions) {
  const { mutate, isPending } = useUpdateTask();
  const queryClient = useQueryClient();

  const toggleBlocked = async (blocked: boolean) => {
    // Guard: Previne mutação se taskId estiver vazio
    if (!taskId) {
      console.warn('[useBlockTask] toggleBlocked chamado sem taskId válido');
      return;
    }

    // 1. Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() });

    // 2. Snapshot previous state
    const previousTasks = queryClient.getQueriesData({
      queryKey: queryKeys.tasks.lists()
    });

    // 3. Optimistically update UI
    queryClient.setQueriesData(
      { queryKey: queryKeys.tasks.lists() },
      (old: TasksResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((task) =>
            task.id === taskId ? { ...task, blocked } : task
          ),
        };
      }
    );

    // 4. Execute mutation
    mutate(
      { id: taskId, data: { blocked } },
      {
        onSuccess: () => {
          toast.success(blocked ? 'Task bloqueada' : 'Task desbloqueada');

          // 5. Invalidate features cache to refresh health status
          // The database trigger recalculates health, we just need to refetch
          queryClient.invalidateQueries({ queryKey: queryKeys.features.lists() });
          queryClient.invalidateQueries({ queryKey: queryKeys.epics.lists() });

          options?.onSuccess?.(blocked);
        },
        onError: (error) => {
          // 6. Rollback on error
          previousTasks.forEach(([queryKey, data]) => {
            queryClient.setQueryData(queryKey, data);
          });
          toast.error('Erro ao atualizar task');
          console.error('Block task error:', error);
          options?.onError?.(error as Error);
        },
      }
    );
  };

  return {
    toggleBlocked,
    isPending,
  };
}
