'use client';

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { StatusColumnHeader } from '@/components/features/tasks/status-badge';
import { KanbanCard } from './kanban-card';
import type { TaskStatus, TaskWithReadableId } from '@/shared/types';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskWithReadableId[];
  onTaskClick?: (task: TaskWithReadableId) => void;
}

export function KanbanColumn({ status, tasks, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  // Memoize sorted tasks for performance
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Critical/High first, then by created date
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-72 bg-card rounded-lg p-4',
        'transition-colors duration-200',
        isOver && 'bg-accent/50 ring-1 ring-primary/50'
      )}
    >
      {/* Header */}
      <div className="mb-4">
        <StatusColumnHeader status={status} count={tasks.length} />
      </div>

      {/* Cards */}
      <div className="space-y-3 min-h-[200px]">
        {sortedTasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick?.(task)}
          />
        ))}

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 border border-dashed rounded-lg">
            <p className="text-xs text-muted-foreground">Arraste tasks aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}
