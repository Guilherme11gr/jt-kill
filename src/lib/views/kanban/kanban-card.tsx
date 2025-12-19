'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { TaskCard } from '@/components/features/tasks/task-card';
import type { TaskWithReadableId } from '@/shared/types';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface KanbanCardProps {
  task: TaskWithReadableId;
  onClick?: () => void;
  onEdit?: (task: TaskWithReadableId) => void;
  onDelete?: (task: TaskWithReadableId) => void;
}

export function KanbanCard({ task, onClick, onEdit, onDelete }: KanbanCardProps) {
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
      <div className="relative group">
        <TaskCard
          task={task}
          variant="kanban"
          isDragging={isDragging}
          onClick={onClick}
        />
        {/* Force action menu to be visible on hover or if menu open */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(task)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(task)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
