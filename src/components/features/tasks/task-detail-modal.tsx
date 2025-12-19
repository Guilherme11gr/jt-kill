'use client';

import { useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bug,
  CheckSquare,
  ChevronRight,
  Pencil,
  Trash2,
  Calendar,
  User,
  Layers,
  Hash,
} from 'lucide-react';
import type { TaskWithReadableId } from '@/shared/types';

interface TaskDetailModalProps {
  task: TaskWithReadableId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (task: TaskWithReadableId) => void;
  onDelete?: (task: TaskWithReadableId) => void;
}

// Status badge variant mapping
const statusVariantMap: Record<string, 'outline' | 'outline-success' | 'outline-info' | 'outline-purple' | 'outline-warning'> = {
  BACKLOG: 'outline',
  TODO: 'outline',
  DOING: 'outline-info',
  REVIEW: 'outline-purple',
  QA_READY: 'outline-warning',
  DONE: 'outline-success',
};

// Priority badge variant mapping
const priorityVariantMap: Record<string, 'outline' | 'outline-warning' | 'destructive'> = {
  LOW: 'outline',
  MEDIUM: 'outline',
  HIGH: 'outline-warning',
  CRITICAL: 'destructive',
};

// Status labels in Portuguese
const statusLabels: Record<string, string> = {
  BACKLOG: 'Backlog',
  TODO: 'A Fazer',
  DOING: 'Em Andamento',
  REVIEW: 'Em Revisão',
  QA_READY: 'Aguardando QA',
  DONE: 'Concluído',
};

// Priority labels in Portuguese
const priorityLabels: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: TaskDetailModalProps) {
  const handleEdit = useCallback(() => {
    if (task && onEdit) {
      onEdit(task);
      onOpenChange(false);
    }
  }, [task, onEdit, onOpenChange]);

  const handleDelete = useCallback(() => {
    if (task && onDelete) {
      onDelete(task);
      onOpenChange(false);
    }
  }, [task, onDelete, onOpenChange]);

  if (!task) return null;

  const isBug = task.type === 'BUG';
  const TaskIcon = isBug ? Bug : CheckSquare;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium">{task.feature.epic.project.name}</span>
            <ChevronRight className="h-3 w-3" />
            <span>{task.feature.epic.title}</span>
            <ChevronRight className="h-3 w-3" />
            <span>{task.feature.title}</span>
          </div>

          {/* Header with ID and Type */}
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${isBug ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
              <TaskIcon className={`h-5 w-5 ${isBug ? 'text-red-500' : 'text-blue-500'}`} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">
                  {task.readableId}
                </Badge>
                <Badge variant={isBug ? 'destructive' : 'outline-info'} className="text-xs">
                  {isBug ? 'Bug' : 'Task'}
                </Badge>
              </div>
              <SheetTitle className="text-lg leading-tight">{task.title}</SheetTitle>
            </div>
          </div>

          {/* Status and Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusVariantMap[task.status] || 'outline'}>
              {statusLabels[task.status] || task.status}
            </Badge>
            <Badge variant={priorityVariantMap[task.priority] || 'outline'}>
              {priorityLabels[task.priority] || task.priority}
            </Badge>
            {task.points && (
              <Badge variant="secondary" className="text-xs">
                {task.points} pts
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Separator className="my-6" />

        {/* Description */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Descrição</h3>
          {task.description ? (
            <div className="prose prose-sm prose-invert max-w-none text-foreground">
              {/* Simple Markdown-like rendering */}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {task.description}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Nenhuma descrição adicionada.
            </p>
          )}
        </div>

        <Separator className="my-6" />

        {/* Metadata */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Detalhes</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Module */}
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Módulo</p>
                <p className="text-sm font-medium">{task.module || '—'}</p>
              </div>
            </div>

            {/* Points */}
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Story Points</p>
                <p className="text-sm font-medium">{task.points || '—'}</p>
              </div>
            </div>

            {/* Assignee placeholder */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Responsável</p>
                <p className="text-sm font-medium">{task.assigneeId ? 'Atribuído' : 'Não atribuído'}</p>
              </div>
            </div>

            {/* Created date */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="text-sm font-medium">
                  {new Date(task.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleEdit}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>

        {/* Hidden description for accessibility */}
        <SheetDescription className="sr-only">
          Detalhes da task {task.readableId}
        </SheetDescription>
      </SheetContent>
    </Sheet>
  );
}
