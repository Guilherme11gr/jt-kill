import { useUpdateTask } from '@/lib/query/hooks/use-tasks';
import { useCurrentOrgId } from '@/lib/query/hooks/use-org-id';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/query-keys';
import { smartInvalidate } from '@/lib/query/helpers';
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
  const orgId = useCurrentOrgId();

  const toggleBlocked = async (blocked: boolean) => {
    // Guard: Previne mutação se taskId estiver vazio
    if (!taskId) {
      console.warn('[useBlockTask] toggleBlocked chamado sem taskId válido');
      return;
    }

    // 1. Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists(orgId) });

    // 2. Snapshot previous state
    const previousTasks = queryClient.getQueriesData({
      queryKey: queryKeys.tasks.lists(orgId)
    });

    // 3. Optimistically update UI
    queryClient.setQueriesData(
      { queryKey: queryKeys.tasks.lists(orgId) },
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

          // Invalidate with smartInvalidate (UPDATE operation)
          smartInvalidate(queryClient, queryKeys.tasks.lists(orgId));
          smartInvalidate(queryClient, queryKeys.features.lists(orgId));
          smartInvalidate(queryClient, queryKeys.epics.lists(orgId));

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
