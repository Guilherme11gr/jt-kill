'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { TaskCard } from '@/components/features/tasks/task-card';
import type { TaskWithReadableId } from '@/shared/types';

interface KanbanCardProps {
  task: TaskWithReadableId;
  onClick?: () => void;
}

export function KanbanCard({ task, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    // Performance: use GPU layer during drag
    willChange: isDragging ? 'transform' : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'transition-shadow duration-200',
        isDragging && 'z-50 cursor-grabbing'
      )}
    >
      <TaskCard
        task={task}
        variant="kanban"
        isDragging={isDragging}
        onClick={onClick}
      />
    </div>
  );
}
