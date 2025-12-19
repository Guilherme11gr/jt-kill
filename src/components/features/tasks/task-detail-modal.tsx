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
import { MarkdownViewer } from '@/components/ui/markdown-viewer';
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
  Copy,
  Layout,
  Tag
} from 'lucide-react';
import type { TaskWithReadableId } from '@/shared/types';
import { StatusBadge } from './status-badge';
import { PriorityIndicator } from './priority-indicator';
import { toast } from 'sonner';

interface TaskDetailModalProps {
  task: TaskWithReadableId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (task: TaskWithReadableId) => void;
  onDelete?: (task: TaskWithReadableId) => void;
}

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

  const handleCopyId = () => {
    if (task?.readableId) {
      navigator.clipboard.writeText(task.readableId);
      toast.success('ID copiado para a área de transferência');
    }
  };

  if (!task) return null;

  const isBug = task.type === 'BUG';
  const TaskIcon = isBug ? Bug : CheckSquare;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto p-0 gap-0 border-l">

        {/* Header Section - Sticky */}
        {/* Aumentei o padding e adicionei bg-background/95 backdrop-blur para dar sensação de app nativo */}
        <div className="sticky top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-6 space-y-4">
          {/* Breadcrumb & ID */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap leading-relaxed">
              <Layout className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium hover:text-foreground transition-colors cursor-default whitespace-nowrap">{task.feature.epic.project.name}</span>
              <ChevronRight className="h-3 w-3 opacity-50 shrink-0" />
              <span className="hover:text-foreground transition-colors cursor-default whitespace-nowrap max-w-[100px] truncate" title={task.feature.epic.title}>{task.feature.epic.title}</span>
              <ChevronRight className="h-3 w-3 opacity-50 shrink-0" />
              <span className="hover:text-foreground transition-colors cursor-default font-medium text-foreground/80 truncate max-w-[150px]" title={task.feature.title}>{task.feature.title}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1.5" onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('task', task.id);
                navigator.clipboard.writeText(url.toString());
                toast.success('Link da task copiado!');
              }}>
                <Copy className="h-3.5 w-3.5" />
                <span className="text-xs">Link</span>
              </Button>
              <Badge variant="outline" className="font-mono text-xs cursor-copy hover:bg-muted" onClick={handleCopyId} title="Copiar ID">
                {task.readableId}
              </Badge>
            </div>
          </div>

          <div className="flex items-start gap-4">
            {/* Icon Box */}
            <div className={`mt-1 p-2.5 rounded-xl shrink-0 ${isBug ? 'bg-red-500/10 text-red-600' : 'bg-blue-500/10 text-blue-600'}`}>
              <TaskIcon className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <SheetTitle className="text-xl md:text-2xl font-semibold leading-tight tracking-tight">
                {task.title}
              </SheetTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Criado em {new Date(task.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
          {/* Main Column */}
          <div className="md:col-span-2 space-y-8">
            {/* Description */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2 text-foreground/80">
                Descrição
              </h3>
              <div className="min-h-[100px]">
                {task.description ? (
                  <MarkdownViewer value={task.description} />
                ) : (
                  <div className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-lg border border-dashed text-center">
                    Nenhuma descrição fornecida para esta tarefa.
                  </div>
                )}
              </div>
            </div>

            {/* Comments Placeholder */}
            {/* 
               <div className="space-y-3 pt-4 border-t">
                  <h3 className="text-sm font-medium">Comentários</h3>
                  <p className="text-xs text-muted-foreground">Em breve...</p>
               </div>
               */}
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <div className="rounded-xl bg-muted/40 p-5 space-y-5 border border-transparent/50">
              {/* Status */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</span>
                <div className="flex">
                  <StatusBadge status={task.status} className="w-full justify-center py-1.5 text-sm" />
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prioridade</span>
                <div className="flex items-center gap-2 p-2 rounded-md border bg-background/50">
                  <PriorityIndicator priority={task.priority} />
                  <span className="text-sm font-medium">{priorityLabels[task.priority]}</span>
                </div>
              </div>

              <Separator />

              {/* Details List */}
              <div className="space-y-4">
                {/* Module */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Módulo</span>
                  </div>
                  <p className="text-sm font-medium pl-5.5">{task.module || '—'}</p>
                </div>

                {/* Points */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Story Points</span>
                  </div>
                  <p className="text-sm font-medium pl-5.5">{task.points || '—'}</p>
                </div>

                {/* Assignee */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Responsável</span>
                  </div>
                  <p className="text-sm font-medium pl-5.5">{task.assigneeId ? 'Atribuído' : '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions - Sticky Bottom */}
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 flex gap-3 justify-end z-10">
          <Button variant="outline" className="gap-2" onClick={handleEdit}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>

        <SheetDescription className="sr-only">
          Detalhes da task {task.readableId}
        </SheetDescription>
      </SheetContent>
    </Sheet>
  );
}
