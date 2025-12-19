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
  onEdit?: (task: TaskWithReadableId) => void;
  onDelete?: (task: TaskWithReadableId) => void;
}

export function KanbanColumn({ status, tasks, onTaskClick, onEdit, onDelete }: KanbanColumnProps) {
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
        'flex-shrink-0 w-80 bg-muted/30 rounded-xl p-4 border border-transparent hover:border-border/40 transition-all duration-300',
        isOver && 'bg-accent/40 ring-2 ring-primary/20 border-primary/30'
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
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 border-2 border-dashed border-muted-foreground/10 rounded-lg bg-background/20">
            <p className="text-xs text-muted-foreground/60 font-medium">Vazio</p>
          </div>
        )}
      </div>
    </div>
  );
}
