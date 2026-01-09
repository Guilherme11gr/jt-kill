/**
 * useMoveTaskWithUndo - Hook para mover task com opção de desfazer
 * 
 * Mostra toast com botão "Desfazer" por 5 segundos.
 */

import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query/query-keys';
import type { TaskWithReadableId, TaskStatus } from '@/shared/types';
import type { TasksResponse } from '@/lib/query/hooks/use-tasks';

// Status labels em português
const STATUS_LABELS: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'A Fazer',
  DOING: 'Em Andamento',
  REVIEW: 'Em Revisão',
  QA_READY: 'QA',
  DONE: 'Concluído',
};

async function moveTask(id: string, status: TaskStatus): Promise<TaskWithReadableId> {
  const res = await fetch(`/api/tasks/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) throw new Error('Failed to move task');
  const json = await res.json();
  return json.data;
}

export function useMoveTaskWithUndo() {
  const queryClient = useQueryClient();
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus; readableId?: string }) => {
      return moveTask(id, status);
    },

    // Optimistic update
    onMutate: async ({ id, status, readableId: providedReadableId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.dashboard.all });

      // Snapshot previous value
      const previousTasks = queryClient.getQueriesData<TasksResponse>({
        queryKey: queryKeys.tasks.lists(),
      });
      const previousDashboard = queryClient.getQueriesData({
        queryKey: queryKeys.dashboard.all,
      });

      // Find the task to get previous status
      let previousStatus: TaskStatus | undefined;
      let taskReadableId: string | undefined = providedReadableId;

      previousTasks.forEach(([, data]) => {
        const task = data?.items?.find((t) => t.id === id);
        if (task) {
          previousStatus = task.status;
          if (!taskReadableId) taskReadableId = task.readableId;
        }
      });

      // Optimistically update
      queryClient.setQueriesData<TasksResponse>(
        { queryKey: queryKeys.tasks.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((task) =>
              task.id === id ? { ...task, status } : task
            ),
          };
        }
      );

      return { previousTasks, previousDashboard, previousStatus, taskReadableId };
    },

    onError: (_err, _vars, context) => {
      // Revert on error
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDashboard) {
        context.previousDashboard.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Erro ao mover task');
    },

    onSuccess: (updatedTask, { status }, context) => {
      const previousStatus = context?.previousStatus;
      const taskReadableId = context?.taskReadableId || updatedTask.readableId;

      // Clear any existing undo timeout
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      // Show toast with undo button
      const toastId = toast.success(
        `${taskReadableId} movida para ${STATUS_LABELS[status]}`,
        {
          duration: 5000,
          action: previousStatus
            ? {
                label: 'Desfazer',
                onClick: () => {
                  // Undo the move
                  moveTask(updatedTask.id, previousStatus).then(() => {
                    // Invalidate to refresh
                    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
                    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
                    toast.success('Ação desfeita');
                  }).catch(() => {
                    toast.error('Erro ao desfazer');
                  });
                },
              }
            : undefined,
        }
      );

      // Auto-dismiss tracking
      undoTimeoutRef.current = setTimeout(() => {
        undoTimeoutRef.current = null;
      }, 5000);
    },

    onSettled: () => {
      // Invalidate and refetch active queries immediately
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tasks.lists(),
        refetchType: 'active' // Only refetch queries that are currently being used
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.dashboard.all,
        refetchType: 'active'
      });
    },
  });

  const moveWithUndo = useCallback(
    (id: string, newStatus: TaskStatus, readableId?: string) => {
      mutation.mutate({ id, status: newStatus, readableId });
    },
    [mutation]
  );

  return {
    moveWithUndo,
    isPending: mutation.isPending,
  };
}
