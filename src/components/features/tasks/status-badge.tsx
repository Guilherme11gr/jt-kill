'use client';

import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/shared/types';

const STATUS_STYLES: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  BACKLOG: {
    bg: 'bg-muted/50',
    text: 'text-muted-foreground',
    label: 'Backlog',
  },
  TODO: {
    bg: 'bg-muted/60',
    text: 'text-foreground',
    label: 'Todo',
  },
  DOING: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    label: 'Doing',
  },
  REVIEW: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    label: 'Review',
  },
  QA_READY: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    label: 'QA Ready',
  },
  DONE: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    label: 'Done',
  },
};

interface StatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium',
        style.bg,
        style.text,
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-sm',
        className
      )}
    >
      {style.label}
    </span>
  );
}

// Column header variant with count and collapse option
interface StatusColumnHeaderProps {
  status: TaskStatus;
  count: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function StatusColumnHeader({ status, count, isCollapsed, onToggleCollapse }: StatusColumnHeaderProps) {
  const style = STATUS_STYLES[status];
  const showCollapseButton = status === 'DONE' && onToggleCollapse;

  // Collapsed layout - vertical and compact
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onToggleCollapse}
          className="text-xs text-muted-foreground hover:text-foreground p-1 rounded hover:bg-background/50 transition-colors"
          title="Expandir coluna"
        >
          ▶
        </button>
        <div className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold",
          style.bg.replace('/20', '/30'),
          style.text,
        )}>
          <div className="w-2 h-2 rounded-full bg-current" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {count}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className={cn(
        "flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors",
        style.bg.replace('/20', '/10'), // Lighter bg
        style.text,
        "border-transparent"
      )}>
        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
        {style.label}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-muted-foreground bg-background/50 px-2 py-0.5 rounded-md border shadow-sm h-6 min-w-[1.5rem] flex items-center justify-center">
          {count}
        </span>
        {showCollapseButton && (
          <button
            onClick={onToggleCollapse}
            className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-background/50 transition-colors"
            title="Colapsar coluna"
          >
            ◀
          </button>
        )}
      </div>
    </div>
  );
}
