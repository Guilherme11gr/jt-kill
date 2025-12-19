'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ViewToggle,
  TaskFilters,
  TaskDialog,
  type ViewMode,
  type TaskFiltersState,
} from '@/components/features/tasks';
import { TaskDetailModal } from '@/components/features/tasks/task-detail-modal';
import { KanbanBoard } from '@/lib/views/kanban';
import { TaskTable } from '@/lib/views/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TaskWithReadableId, TaskStatus } from '@/shared/types';
import { toast } from 'sonner';

// Hook for fetching tasks
function useTasks() {
  const [tasks, setTasks] = useState<TaskWithReadableId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tasks?pageSize=100');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data.data?.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast.error("Erro ao carregar tasks");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useState(() => {
    fetchTasks();
  });

  return { tasks, isLoading, error, refetch: fetchTasks, setTasks };
}

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewMode>('kanban');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithReadableId | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithReadableId | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [features, setFeatures] = useState<{ id: string; title: string }[]>([]);
  const [modules, setModules] = useState<string[]>([]);

  // Delete Task State
  const [taskToDelete, setTaskToDelete] = useState<TaskWithReadableId | null>(null);

  const [filters, setFilters] = useState<TaskFiltersState>({
    search: '',
    status: 'all',
    priority: 'all',
    module: 'all',
  });

  const { tasks, isLoading, error, refetch } = useTasks();

  // Filter tasks client-side
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(searchLower);
        const matchesId = task.readableId.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesId) return false;
      }

      // Status
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }

      // Priority
      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false;
      }

      // Module
      if (filters.module !== 'all' && task.module !== filters.module) {
        return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // Handle task move (Kanban drag-drop)
  const handleTaskMove = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update task');
      await refetch();
    } catch (err) {
      console.error('Failed to move task:', err);
      toast.error('Falha ao mover task');
      throw err;
    }
  }, [refetch]);

  // Handle delete task click (opens dialog)
  const handleDeleteTaskClick = useCallback((task: TaskWithReadableId) => {
    setTaskToDelete(task);
  }, []);

  // Confirm delete task implementation
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      const res = await fetch(`/api/tasks/${taskToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete task');

      refetch();
      setTaskToDelete(null);
      // If the deleted task was open in modal, close it
      if (selectedTask?.id === taskToDelete.id) {
        setIsDetailModalOpen(false);
      }
      toast.success('Task excluída com sucesso');
    } catch (error) {
      console.error("Failed to delete task", error);
      toast.error("Erro ao excluir task");
    }
  };

  // Handle edit task - open dialog
  const handleEditTask = useCallback((task: TaskWithReadableId) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  }, []);

  // Handle dialog open change
  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingTask(null);
    }
  };

  // Fetch features for dropdown
  const fetchFeatures = useCallback(async () => {
    try {
      const res = await fetch('/api/features');
      if (res.ok) {
        const data = await res.json();
        setFeatures(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch features", error);
    }
  }, []);

  // Fetch features on mount
  useState(() => {
    fetchFeatures();
  });

  // Fetch modules from projects
  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        const allModules = new Set<string>();
        (data.data || []).forEach((project: { modules?: string[] }) => {
          project.modules?.forEach((m: string) => allModules.add(m));
        });
        setModules(Array.from(allModules).sort());
      }
    } catch (error) {
      console.error("Failed to fetch modules", error);
    }
  }, []);

  // Fetch modules on mount
  useState(() => {
    fetchModules();
  });

  // Handle task click - open detail modal and update URL
  const handleTaskClick = useCallback((task: TaskWithReadableId) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('task', task.id);
    router.push(`/tasks?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Handle closing detail modal
  const handleDetailModalClose = useCallback((open: boolean) => {
    setIsDetailModalOpen(open);
    if (!open) {
      setSelectedTask(null);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('task');
      const newUrl = params.toString() ? `/tasks?${params.toString()}` : '/tasks';
      router.push(newUrl, { scroll: false });
    }
  }, [router, searchParams]);

  // Open task from URL query param
  useEffect(() => {
    const taskId = searchParams.get('task');
    if (taskId && tasks.length > 0 && !isDetailModalOpen) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        setIsDetailModalOpen(true);
      }
    }
  }, [searchParams, tasks, isDetailModalOpen]);

  // Map editingTask to TaskDialog expected format
  const taskToEditForDialog = editingTask ? {
    id: editingTask.id,
    title: editingTask.title,
    description: editingTask.description,
    type: editingTask.type,
    priority: editingTask.priority,
    status: editingTask.status,
    points: editingTask.points?.toString(),
    module: editingTask.module,
    featureId: editingTask.feature.id
  } : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Minhas Tasks
          </h1>
          <p className="text-muted-foreground">
            {filteredTasks.length} tasks encontradas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={refetch}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          <ViewToggle value={view} onChange={setView} />

          <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Task</span>
          </Button>
        </div>
      </div>

      <TaskDialog
        open={isDialogOpen}
        onOpenChange={handleDialogChange}
        features={features}
        modules={modules}
        // @ts-ignore - TS might complain about optional properties matching but it's fine for now
        taskToEdit={taskToEditForDialog}
        onSuccess={refetch}
      />

      {/* Filters */}
      <TaskFilters
        filters={filters}
        onChange={setFilters}
        modules={modules}
      />

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/50">
          <p>Erro ao carregar tasks: {error}</p>
          <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
            Tentar novamente
          </Button>
        </div>
      )}

      {/* View */}
      {!error && (
        <div className="animate-in fade-in-50 duration-200">
          {view === 'kanban' ? (
            <KanbanBoard
              tasks={filteredTasks}
              onTaskMove={handleTaskMove}
              onTaskClick={handleTaskClick}
              onEdit={handleEditTask}
              onDelete={handleDeleteTaskClick}
              isLoading={isLoading}
            />
          ) : (
            <TaskTable
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              isLoading={isLoading}
            />
          )}
        </div>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        open={isDetailModalOpen}
        onOpenChange={handleDetailModalClose}
        onEdit={handleEditTask}
        onDelete={handleDeleteTaskClick}
      />

      {/* Delete Task Confirmation Dialog */}
      <Dialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <DialogContent className="z-modal">
          <DialogHeader>
            <DialogTitle>Você tem certeza?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a task
              <span className="font-medium text-foreground"> "{taskToDelete?.title}" </span>
              e todos os dados associados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setTaskToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTask}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
