"use client";

import { useState, useCallback, use, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckSquare } from "lucide-react";

import { TaskDialog, TaskDetailModal } from "@/components/features/tasks";
import { KanbanBoard } from "@/lib/views/kanban";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import type { TaskWithReadableId, TaskStatus } from "@/shared/types";
import { useFeature, useTasks, useProject, useMoveTask, useDeleteTask, useModules } from "@/lib/query";

export default function FeatureDetailPage({
  params,
}: {
  params: Promise<{ id: string; epicId: string; featureId: string }>;
}) {
  const resolvedParams = use(params);

  // React Query hooks
  const { data: feature, isLoading: featureLoading } = useFeature(resolvedParams.featureId);
  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks, isFetching } = useTasks({ featureId: resolvedParams.featureId });
  const { data: modules = [] } = useModules();

  // Mutations
  const moveTaskMutation = useMoveTask();
  const deleteTaskMutation = useDeleteTask();

  const loading = featureLoading || tasksLoading;
  const tasks = (tasksData?.items ?? []) as TaskWithReadableId[];

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Dialog States
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithReadableId | null>(null);

  // Detail Modal State (sidebar)
  const [selectedTask, setSelectedTask] = useState<TaskWithReadableId | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithReadableId | null>(null);

  // Deep Linking Effect
  useEffect(() => {
    const taskIdFromUrl = searchParams.get('task');
    if (taskIdFromUrl && tasks.length > 0) {
      const task = tasks.find(t => t.id === taskIdFromUrl);
      if (task) {
        setSelectedTask(task);
        setIsDetailModalOpen(true);
      }
    } else if (!taskIdFromUrl && isDetailModalOpen) {
      // If URL param removed (e.g. browser back), close modal
      setIsDetailModalOpen(false);
      setSelectedTask(null);
    }
  }, [searchParams, tasks, isDetailModalOpen]);


  const handleTaskMove = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    await moveTaskMutation.mutateAsync({ id: taskId, status: newStatus });
  }, [moveTaskMutation]);

  const handleDeleteTaskClick = useCallback((task: TaskWithReadableId) => {
    setTaskToDelete(task);
  }, []);

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTaskMutation.mutateAsync(taskToDelete.id);
      setTaskToDelete(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditTask = useCallback((task: TaskWithReadableId) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
    // Close detail modal if open
    setIsDetailModalOpen(false);
  }, []);

  const handleTaskClick = useCallback((task: TaskWithReadableId) => {
    // Update URL without reload
    const params = new URLSearchParams(searchParams);
    params.set('task', task.id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    // State update happens via useEffect or we can do optimistic
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  }, [pathname, router, searchParams]);

  const handleDetailModalClose = useCallback((open: boolean) => {
    if (!open) {
      const params = new URLSearchParams(searchParams);
      params.delete('task');
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
      setSelectedTask(null);
    }
    setIsDetailModalOpen(open);
  }, [pathname, router, searchParams]);

  const handleDialogChange = (open: boolean) => {
    setIsTaskDialogOpen(open);
    if (!open) setEditingTask(null);
  };

  const dialogFeatures = useMemo(() => {
    return feature ? [{ id: feature.id, title: feature.title }] : [];
  }, [feature]);

  const taskToEditForDialog = editingTask ? {
    id: editingTask.id,
    title: editingTask.title,
    description: editingTask.description,
    type: editingTask.type,
    priority: editingTask.priority,
    status: editingTask.status,
    points: editingTask.points?.toString(),
    module: editingTask.module,
    featureId: editingTask.feature?.id || feature?.id || ""
  } : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Feature não encontrada</h2>
        <Link href={`/projects/${resolvedParams.id}`}>
          <Button variant="outline">Voltar para o Projeto</Button>
        </Link>
      </div>
    );
  }

  // Inject feature into tasks if missing (for KanbanBoard display)
  const tasksForKanban = tasks.map(t => ({
    ...t,
    feature: t.feature || { id: feature.id, title: feature.title }
  }));

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/projects/${resolvedParams.id}/epics/${resolvedParams.epicId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para {feature.epic.title}
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <span>{feature.epic.project.key}</span>
              <span>→</span>
              <span>{feature.epic.title}</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline">FEATURE</Badge>
              <Badge variant="secondary">{feature.status}</Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              {feature.title}
            </h1>
            {feature.description && (
              <p className="text-muted-foreground max-w-2xl">
                {feature.description}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchTasks()}
              disabled={loading || isFetching}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={() => setIsTaskDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Task
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nenhuma task ainda"
          description="Crie tasks para detalhar o trabalho necessário nesta feature."
          action={
            <Button onClick={() => setIsTaskDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Criar Primeira Task
            </Button>
          }
        />
      ) : (
        <div className="animate-in fade-in-50 duration-200">
          <KanbanBoard
            tasks={tasksForKanban}
            onTaskMove={handleTaskMove}
            onTaskClick={handleTaskClick}
            onEdit={handleEditTask}
            onDelete={handleDeleteTaskClick}
            isLoading={loading}
          />
        </div>
      )}

      {/* Universal Task Dialog */}
      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={handleDialogChange}
        features={dialogFeatures}
        defaultFeatureId={feature.id}
        modules={modules}
        // @ts-ignore
        taskToEdit={taskToEditForDialog}
        onSuccess={refetchTasks}
      />

      {/* Task Detail Modal (Sidebar) */}
      <TaskDetailModal
        task={selectedTask}
        open={isDetailModalOpen}
        onOpenChange={handleDetailModalClose}
        onEdit={handleEditTask}
        onDelete={handleDeleteTaskClick}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <DialogContent className="z-modal">
          <DialogHeader>
            <DialogTitle>Excluir Task?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A task <strong>"{taskToDelete?.title}"</strong> será permanentemente excluída.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setTaskToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteTask}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
