'use client';

import { cn } from '@/lib/utils';
import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'kanban' | 'table';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-muted', className)}>
      <button
        onClick={() => onChange('kanban')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
          'transition-colors duration-150',
          value === 'kanban'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Kanban</span>
      </button>
      <button
        onClick={() => onChange('table')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
          'transition-colors duration-150',
          value === 'table'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">Table</span>
      </button>
    </div>
  );
}
