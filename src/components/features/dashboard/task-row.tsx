'use client';

import { Bug, CheckSquare, AlertTriangle, ChevronRight, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/features/tasks/status-badge';
import { UserAvatar } from '@/components/features/shared';
import { cn } from '@/lib/utils';
import { useTaskModal } from '@/providers/task-modal-provider';
import type { TaskWithReadableId } from '@/shared/types';

interface TaskRowProps {
  task: TaskWithReadableId;
  showProject?: boolean;
  showAssignee?: boolean;
}

/**
 * TaskRow - Linha compacta de task para dashboard
 * 
 * Foco em ação: mostra apenas informações essenciais
 * - Tipo (Bug/Task)
 * - Status de bloqueio
 * - Título
 * - Status atual
 * - Assignee (opcional, para view de equipe)
 * 
 * Clique abre modal global (não navega).
 */
export function TaskRow({ task, showProject = false, showAssignee = false }: TaskRowProps) {
  const { openTask } = useTaskModal();
  const isBug = task.type === 'BUG';
  const isBlocked = task.blocked;

  return (
    <button
      type="button"
      onClick={() => openTask(task)}
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left',
        'hover:bg-accent/50',
        isBlocked && 'bg-red-500/5 hover:bg-red-500/10 border-l-2 border-red-500',
        !isBlocked && 'border-l-2 border-transparent'
      )}
    >
      {/* Tipo + Bloqueio */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isBug ? (
          <div className="p-1 rounded bg-red-500/10">
            <Bug className="h-3.5 w-3.5 text-red-500" />
          </div>
        ) : (
          <div className="p-1 rounded bg-blue-500/10">
            <CheckSquare className="h-3.5 w-3.5 text-blue-500" />
          </div>
        )}
        
        {isBlocked && (
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 animate-pulse" />
        )}
      </div>

      {/* ID + Título */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px] px-1.5 shrink-0">
            {task.readableId}
          </Badge>
          <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {task.title}
          </span>
        </div>
        
        {showProject && (
          <span className="text-xs text-muted-foreground truncate">
            {task.feature?.epic?.project?.name}
          </span>
        )}

        {showAssignee && (
          <div className="flex items-center gap-1.5 mt-1">
            {task.assigneeId ? (
              <UserAvatar userId={task.assigneeId} size="sm" showName />
            ) : (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3 text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground/70">Sem responsável</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={task.status} size="sm" />
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}
