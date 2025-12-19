"use client";

import { useState, useEffect, useCallback, use, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckSquare } from "lucide-react";

import { TaskDialog } from "@/components/features/tasks";
import { KanbanBoard } from "@/lib/views/kanban";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import type { TaskWithReadableId, TaskStatus } from "@/shared/types";

interface Feature {
  id: string;
  title: string;
  description: string | null;
  status: string;
  epic: {
    id: string;
    title: string;
    project: {
      id: string;
      name: string;
      key: string;
      modules?: string[];
    };
  };
}

export default function FeatureDetailPage({
  params,
}: {
  params: Promise<{ id: string; epicId: string; featureId: string }>;
}) {
  const resolvedParams = use(params);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [tasks, setTasks] = useState<TaskWithReadableId[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithReadableId | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithReadableId | null>(null);

  // Data for Dialog
  const [modules, setModules] = useState<string[]>([]);

  const fetchFeatureData = async () => {
    try {
      const featureRes = await fetch(`/api/features/${resolvedParams.featureId}`);
      if (!featureRes.ok) throw new Error("Falha ao carregar feature");

      const featureData = await featureRes.json();
      setFeature(featureData.data);

      // Extract modules from project directly if available in feature response
      // or fetch project details if needed. Assuming typical structure.
      // If feature.epic.project has modules, use them.
      // Otherwise might need to fetch project. For now, let's assume we can get it or lazy load.
      // But let's fetch tasks first.
    } catch (error) {
      console.error("Erro ao buscar feature:", error);
      toast.error("Erro ao carregar dados da feature");
    }
  };

  const fetchTasks = async () => {
    try {
      const tasksRes = await fetch(`/api/tasks?featureId=${resolvedParams.featureId}&pageSize=100`);
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.data?.items || []);
      }
    } catch (error) {
      console.error("Erro ao buscar tasks:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchFeatureData(), fetchTasks()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [resolvedParams.featureId]);

  // Fetch modules separately if needed, or extract from feature/project
  useEffect(() => {
    if (feature?.epic?.project?.id) {
      // Fetch project to get modules
      fetch(`/api/projects/${feature.epic.project.id}`)
        .then(res => res.json())
        .then(data => {
          if (data?.modules) setModules(data.modules);
          // Also supports if api returns data.data.modules
          if (data?.data?.modules) setModules(data.data.modules);
        })
        .catch(err => console.error("Error fetching modules", err));
    }
  }, [feature]);


  const handleTaskMove = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    try {
      // Optimistic update
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ));

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update task');
        // Revert on failure would go here
      }

      // Background refetch to ensure consistency
      fetchTasks();
    } catch (err) {
      console.error('Failed to move task:', err);
      toast.error('Falha ao mover task');
      fetchTasks(); // Revert
    }
  }, []);

  const handleDeleteTaskClick = useCallback((task: TaskWithReadableId) => {
    setTaskToDelete(task);
  }, []);

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      const res = await fetch(`/api/tasks/${taskToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Task excluída com sucesso!");
        setTaskToDelete(null);
        fetchTasks();
      } else {
        toast.error("Erro ao excluir task");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao excluir task");
    }
  };

  const handleEditTask = useCallback((task: TaskWithReadableId) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  }, []);

  const handleDialogChange = (open: boolean) => {
    setIsTaskDialogOpen(open);
    if (!open) setEditingTask(null);
  };

  // Prepare data for TaskDialog
  // Even if tasks API doesn't return feature populated (it usually does for list), we ensure it.
  // Actually, KanbaBoard expects TaskWithReadableId.
  // TaskDialog expects feature object for the list.

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
              onClick={loadData}
              disabled={loading}
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
            onTaskClick={handleEditTask}
            onEdit={handleEditTask}
            onDelete={handleDeleteTaskClick}
            isLoading={loading} // loading is false here but required by prop
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
        onSuccess={fetchTasks}
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
