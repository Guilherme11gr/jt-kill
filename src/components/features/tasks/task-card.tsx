'use client';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bug } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { PriorityIndicator } from './priority-indicator';
import type { TaskWithReadableId } from '@/shared/types';

// Generate consistent colors for modules based on hash
const MODULE_COLORS = [
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-green-500/20 text-green-300 border-green-500/30',
  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getModuleColor(module: string): string {
  const index = hashString(module) % MODULE_COLORS.length;
  return MODULE_COLORS[index];
}

interface TaskCardProps {
  task: TaskWithReadableId;
  variant?: 'kanban' | 'compact';
  isDragging?: boolean;
  onClick?: () => void;
  className?: string;
}

export function TaskCard({
  task,
  variant = 'kanban',
  isDragging = false,
  onClick,
  className,
}: TaskCardProps) {
  const isBug = task.type === 'BUG';

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 cursor-pointer transition-all duration-200',
        'hover:bg-accent/50 hover:border-primary/30',
        isBug && 'border-l-2 border-l-red-500',
        isDragging && 'rotate-2 scale-[1.02] shadow-lg opacity-90',
        className
      )}
    >
      {/* Header: Module + ID + Priority */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {task.module && (
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0 shrink-0', getModuleColor(task.module))}
            >
              {task.module}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground font-mono truncate">
            {task.readableId}
          </span>
        </div>
        <PriorityIndicator priority={task.priority} />
      </div>

      {/* Body: Title */}
      <h4 className={cn(
        'text-sm font-medium leading-relaxed mb-3',
        variant === 'kanban' ? 'line-clamp-2' : 'line-clamp-1'
      )}>
        {task.title}
      </h4>

      {/* Footer: Avatar + Points + Bug */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assigneeId && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={undefined} />
              <AvatarFallback className="text-[10px] bg-muted">
                {task.assigneeId.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        <div className="flex items-center gap-2">
          {task.points && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {task.points}
            </Badge>
          )}
          {isBug && (
            <Bug className="w-3.5 h-3.5 text-red-500" />
          )}
        </div>
      </div>
    </Card>
  );
}
