'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/features/tasks';
import { TableRow } from './table-row';
import { TABLE_COLUMNS, type SortState } from './types';
import type { TaskWithReadableId } from '@/shared/types';

interface TaskTableProps {
  tasks: TaskWithReadableId[];
  onTaskClick?: (task: TaskWithReadableId) => void;
  isLoading?: boolean;
}

export function TaskTable({ tasks, onTaskClick, isLoading = false }: TaskTableProps) {
  const [sort, setSort] = useState<SortState>({ column: 'createdAt', direction: 'desc' });

  // Handle column header click
  const handleSort = (column: string) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Sort tasks
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aVal = getSortValue(a, sort.column);
      const bVal = getSortValue(b, sort.column);

      if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, sort]);

  if (isLoading) {
    return <TableSkeleton rows={10} />;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[100px_1fr_120px_100px_100px_60px] gap-4 items-center px-4 py-3 bg-muted/30 border-b">
        {TABLE_COLUMNS.map((col) => (
          <button
            key={col.key}
            onClick={() => col.sortable && handleSort(col.key)}
            className={cn(
              'flex items-center gap-1 text-xs font-medium text-muted-foreground',
              'hover:text-foreground transition-colors',
              col.sortable && 'cursor-pointer',
              col.key === 'title' && 'justify-start',
              col.key === 'points' && 'justify-center'
            )}
          >
            {col.label}
            {col.sortable && (
              <SortIcon column={col.key} currentSort={sort} />
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="divide-y divide-border/50">
        {sortedTasks.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-muted-foreground">Nenhuma task encontrada</p>
          </div>
        ) : (
          sortedTasks.map((task) => (
            <TableRow
              key={task.id}
              task={task}
              onClick={() => onTaskClick?.(task)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Helper: Get sortable value from task
function getSortValue(task: TaskWithReadableId, column: string): string | number {
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const statusOrder = { BACKLOG: 0, TODO: 1, DOING: 2, REVIEW: 3, QA_READY: 4, DONE: 5 };

  switch (column) {
    case 'readableId':
      return task.readableId;
    case 'title':
      return task.title.toLowerCase();
    case 'status':
      return statusOrder[task.status];
    case 'priority':
      return priorityOrder[task.priority];
    case 'module':
      return task.module || 'zzz'; // Put empty at end
    case 'points':
      return task.points || 999; // Put empty at end
    default:
      return '';
  }
}

// Sort icon component
function SortIcon({ column, currentSort }: { column: string; currentSort: SortState }) {
  if (currentSort.column !== column) {
    return <ChevronsUpDown className="w-3 h-3 opacity-50" />;
  }
  return currentSort.direction === 'asc' ? (
    <ChevronUp className="w-3 h-3" />
  ) : (
    <ChevronDown className="w-3 h-3" />
  );
}
