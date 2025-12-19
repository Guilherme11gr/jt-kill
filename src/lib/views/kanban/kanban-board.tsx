'use client';

import { useState, useCallback, useMemo } from 'react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { TaskCard, KanbanBoardSkeleton } from '@/components/features/tasks';
import { KanbanColumn } from './kanban-column';
import { useDragDrop } from './use-drag-drop';
import { KANBAN_COLUMNS, groupTasksByStatus } from './types';
import type { TaskStatus, TaskWithReadableId } from '@/shared/types';

interface KanbanBoardProps {
  tasks: TaskWithReadableId[];
  onTaskMove: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onTaskClick?: (task: TaskWithReadableId) => void;
  isLoading?: boolean;
}

export function KanbanBoard({
  tasks,
  onTaskMove,
  onTaskClick,
  isLoading = false,
}: KanbanBoardProps) {
  // Local optimistic state
  const [optimisticTasks, setOptimisticTasks] = useState<TaskWithReadableId[]>([]);
  const [pendingMoves, setPendingMoves] = useState<Set<string>>(new Set());

  // Merge server tasks with optimistic updates
  const mergedTasks = useMemo(() => {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    optimisticTasks.forEach((t) => taskMap.set(t.id, t));
    return Array.from(taskMap.values());
  }, [tasks, optimisticTasks]);

  // Group by status
  const tasksByStatus = useMemo(() => groupTasksByStatus(mergedTasks), [mergedTasks]);

  // Handle drag end with optimistic update
  const handleDragEnd = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      // Optimistic update
      const optimisticTask = { ...task, status: newStatus };
      setOptimisticTasks((prev) => [...prev.filter((t) => t.id !== taskId), optimisticTask]);
      setPendingMoves((prev) => new Set(prev).add(taskId));

      try {
        await onTaskMove(taskId, newStatus);
        // Clear optimistic on success (server state will update)
        setOptimisticTasks((prev) => prev.filter((t) => t.id !== taskId));
      } catch (error) {
        // Rollback on error
        setOptimisticTasks((prev) => prev.filter((t) => t.id !== taskId));
        console.error('Failed to move task:', error);
      } finally {
        setPendingMoves((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    },
    [tasks, onTaskMove]
  );

  const {
    sensors,
    activeTask,
    handleDragStart,
    handleDragEnd: dndHandleDragEnd,
    collisionDetection,
  } = useDragDrop({
    tasks: mergedTasks,
    onDragEnd: handleDragEnd,
  });

  if (isLoading) {
    return <KanbanBoardSkeleton />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragEnd={dndHandleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 scroll-smooth">
        {KANBAN_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      {/* Drag overlay - renders in portal above everything */}
      <DragOverlay>
        {activeTask && (
          <div className="rotate-3 scale-105">
            <TaskCard task={activeTask} variant="kanban" isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
