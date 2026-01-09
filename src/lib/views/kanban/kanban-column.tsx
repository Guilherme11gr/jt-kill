'use client';

import { useMemo, useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

const DONE_INITIAL_LIMIT = 10; // Mostrar apenas as últimas 10 tasks DONE por padrão
const STORAGE_KEY = 'kanban-done-collapsed';

export function KanbanColumn({ status, tasks, onTaskClick, onEdit, onDelete }: KanbanColumnProps) {
  // DONE column starts collapsed by default
  const [isCollapsed, setIsCollapsed] = useState(status === 'DONE');
  const [showAllDone, setShowAllDone] = useState(false);

  useEffect(() => {
    if (status === 'DONE' && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        // Only expand if explicitly saved as 'false'
        if (stored === 'false') {
          setIsCollapsed(false);
        }
      } catch {
        // localStorage não disponível (modo privado, quota excedida, etc)
      }
    }
  }, [status]);

  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, String(newState));
      } catch {
        // localStorage não disponível
      }
    }
  };
  
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

  // Apply limit to DONE column to prevent infinite scroll
  const visibleTasks = useMemo(() => {
    if (status !== 'DONE') return sortedTasks;
    if (showAllDone) return sortedTasks;
    return sortedTasks.slice(0, DONE_INITIAL_LIMIT);
  }, [status, sortedTasks, showAllDone]);

  const hiddenTasksCount = status === 'DONE' && !showAllDone 
    ? Math.max(0, sortedTasks.length - DONE_INITIAL_LIMIT)
    : 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 bg-muted/30 rounded-xl border border-transparent hover:border-border/40 transition-all duration-300',
        isOver && 'bg-accent/40 ring-2 ring-primary/20 border-primary/30',
        // Width and padding: collapsed DONE is narrower and more compact
        status === 'DONE' && isCollapsed ? 'w-14 p-2' : 'w-80 p-4'
      )}
    >
      {/* Header */}
      <div className={cn(status === 'DONE' && isCollapsed ? 'mb-2' : 'mb-4')}>
        <StatusColumnHeader 
          status={status} 
          count={tasks.length}
          isCollapsed={status === 'DONE' ? isCollapsed : undefined}
          onToggleCollapse={status === 'DONE' ? handleToggleCollapse : undefined}
        />
      </div>

      {/* Cards - hidden when collapsed */}
      {!isCollapsed && (
        <div className="space-y-3 min-h-[200px]">
          {visibleTasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick?.(task)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}

          {/* Show more button for DONE column */}
          {hiddenTasksCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/20 hover:border-muted-foreground/40"
              onClick={() => setShowAllDone(true)}
            >
              <ChevronDown className="w-3 h-3 mr-1" />
              Ver mais {hiddenTasksCount} task{hiddenTasksCount > 1 ? 's' : ''}
            </Button>
          )}

          {/* Empty state */}
          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-24 border-2 border-dashed border-muted-foreground/10 rounded-lg bg-background/20">
              <p className="text-xs text-muted-foreground/60 font-medium">Vazio</p>
            </div>
          )}
        </div>
      )}

      {/* Collapsed state indicator - minimal vertical text */}
      {isCollapsed && tasks.length > 0 && (
        <div 
          className="flex items-center justify-center py-4 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
          onClick={handleToggleCollapse}
          title="Clique para expandir"
        >
          <span className="text-xs font-medium text-muted-foreground [writing-mode:vertical-rl] [text-orientation:mixed]">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
