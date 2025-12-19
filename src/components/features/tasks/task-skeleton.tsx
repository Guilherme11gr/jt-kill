'use client';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface TaskSkeletonProps {
  variant?: 'card' | 'row';
  className?: string;
}

export function TaskSkeleton({ variant = 'card', className }: TaskSkeletonProps) {
  if (variant === 'row') {
    return (
      <div className={cn('flex items-center gap-4 p-3 animate-pulse', className)}>
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-4 flex-1 bg-muted rounded" />
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-6 w-6 bg-muted rounded-full" />
      </div>
    );
  }

  return (
    <Card className={cn('p-3 animate-pulse', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-12 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
        <div className="h-4 w-4 bg-muted rounded" />
      </div>

      {/* Body */}
      <div className="space-y-1.5 mb-2">
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-5 bg-muted rounded-full" />
        <div className="h-4 w-8 bg-muted rounded" />
      </div>
    </Card>
  );
}

// Column skeleton for Kanban loading state
export function KanbanColumnSkeleton() {
  return (
    <div className="flex-shrink-0 w-72 bg-card rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-5 w-20 bg-muted rounded" />
        <div className="h-4 w-6 bg-muted rounded" />
      </div>
      <div className="space-y-3">
        <TaskSkeleton />
        <TaskSkeleton />
        <TaskSkeleton />
      </div>
    </div>
  );
}

// Full Kanban board skeleton
export function KanbanBoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <KanbanColumnSkeleton key={i} />
      ))}
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-4 p-3 border-b animate-pulse">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-4 flex-1 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <TaskSkeleton key={i} variant="row" />
      ))}
    </div>
  );
}
