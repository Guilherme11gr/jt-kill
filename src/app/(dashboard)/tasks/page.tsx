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
import { PageHeaderSkeleton } from '@/components/layout/page-skeleton';
import { KanbanBoardSkeleton } from '@/components/features/tasks';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TaskWithReadableId, TaskStatus } from '@/shared/types';
import {
  useTasks,
  useProjects,
  useModules,
  useMoveTask,
  useDeleteTask,
  useAllFeatures,
} from '@/lib/query';
import { useAllEpics } from '@/lib/query/hooks/use-epics';

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewMode>('kanban');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithReadableId | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithReadableId | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Delete Task State
  const [taskToDelete, setTaskToDelete] = useState<TaskWithReadableId | null>(null);

  /* 
    Updated to sync with URL query params. 
    We use a lazy initializer to set the initial state from the URL.
  */
  const [filters, setFilters] = useState<TaskFiltersState>(() => {
    const params = new URLSearchParams(searchParams.toString());
    return {
      search: params.get('search') || '',
      status: (params.get('status') as any) || 'all',
      priority: (params.get('priority') as any) || 'all',
      module: params.get('module') || 'all',
      projectId: params.get('projectId') || 'all',
      epicId: params.get('epicId') || 'all',
      featureId: params.get('featureId') || 'all',
    };
  });

  // Handler to update both state and URL explicitly
  const handleFiltersChange = useCallback((newFilters: TaskFiltersState) => {
    setFilters(newFilters);

    const params = new URLSearchParams(searchParams.toString());
    let hasChanges = false;

    // Helper to sync specific key
    const syncParam = (key: string, value: string) => {
      const currentValue = params.get(key);
      if (value && value !== 'all') {
        if (currentValue !== value) {
          params.set(key, value);
          hasChanges = true;
        }
      } else {
        if (currentValue) {
          /**
           * Special handling for projectId:
           * If we clear projectId (set to 'all'), we must also ensure epicId and featureId are cleared/all
           * in the URL if they aren't already handled by the newsFilters.
           * However, TaskFilters component usually resets them in the object it passes.
           * So relying on newFiltersToCheck is sufficient.
           */
          params.delete(key);
          hasChanges = true;
        }
      }
    };

    syncParam('search', newFilters.search);
    syncParam('status', newFilters.status);
    syncParam('priority', newFilters.priority);
    syncParam('module', newFilters.module);
    syncParam('projectId', newFilters.projectId);
    syncParam('epicId', newFilters.epicId);
    syncParam('featureId', newFilters.featureId);

    if (hasChanges) {
      const newQuery = params.toString();
      const currentSearch = searchParams.get('search') || '';
      // If search string changed, use replace to avoid history spam. Otherwise use push.
      if (currentSearch !== newFilters.search) {
        router.replace(newQuery ? `/tasks?${newQuery}` : '/tasks', { scroll: false });
      } else {
        router.push(newQuery ? `/tasks?${newQuery}` : '/tasks', { scroll: false });
      }
    }
  }, [router, searchParams]);

  // Sync from URL (Browser Back/Forward)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Construct what the state SHOULD be based on URL
    const urlFilters: TaskFiltersState = {
      search: params.get('search') || '',
      status: (params.get('status') as any) || 'all',
      priority: (params.get('priority') as any) || 'all',
      module: params.get('module') || 'all',
      projectId: params.get('projectId') || 'all',
      epicId: params.get('epicId') || 'all',
      featureId: params.get('featureId') || 'all',
    };

    // Only update state if it differs from current state
    setFilters(prev => {
      const isDifferent =
        urlFilters.search !== prev.search ||
        urlFilters.status !== prev.status ||
        urlFilters.priority !== prev.priority ||
        urlFilters.module !== prev.module ||
        urlFilters.projectId !== prev.projectId ||
        urlFilters.epicId !== prev.epicId ||
        urlFilters.featureId !== prev.featureId;

      return isDifferent ? urlFilters : prev;
    });
  }, [searchParams]);

  // React Query hooks for shared cache
  const { data: tasksData, isLoading, error, refetch, isFetching } = useTasks();
  const { data: projectsData } = useProjects();
  const { data: epicsData } = useAllEpics();
  const { data: featuresData } = useAllFeatures();
  const { data: modulesData } = useModules();

  // Mutations
  const moveTaskMutation = useMoveTask();
  const deleteTaskMutation = useDeleteTask();

  // Derived data
  const tasks = tasksData?.items ?? [];
  const projects = projectsData ?? [];
  const epics = epicsData ?? [];
  const features = featuresData ?? [];
  const modules = modulesData ?? [];

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

      // Module (check if task has this module in its array)
      if (filters.module !== 'all') {
        if (!task.modules || !task.modules.includes(filters.module)) {
          return false;
        }
      }

      // Project (via feature.epic.project)
      if (filters.projectId !== 'all') {
        const projectId = task.feature?.epic?.project?.id;
        if (projectId !== filters.projectId) return false;
      }

      // Epic (via feature.epic)
      if (filters.epicId !== 'all') {
        const epicId = task.feature?.epic?.id;
        if (epicId !== filters.epicId) return false;
      }

      // Feature
      if (filters.featureId !== 'all') {
        const featureId = task.feature?.id || task.featureId;
        if (featureId !== filters.featureId) return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // Handle task move (Kanban drag-drop) - now uses optimistic updates
  const handleTaskMove = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    await moveTaskMutation.mutateAsync({ id: taskId, status: newStatus });
  }, [moveTaskMutation]);

  // Handle delete task click (opens dialog)
  const handleDeleteTaskClick = useCallback((task: TaskWithReadableId) => {
    setTaskToDelete(task);
  }, []);

  // Confirm delete task implementation
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    await deleteTaskMutation.mutateAsync(taskToDelete.id);
    setTaskToDelete(null);
    // If the deleted task was open in modal, close it
    if (selectedTask?.id === taskToDelete.id) {
      setIsDetailModalOpen(false);
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

  // Handle task click - open detail modal and update URL without full router transition for fluidity
  const handleTaskClick = useCallback((task: TaskWithReadableId) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);

    // Manually update URL to avoid Next.js router processing lag during animation
    const params = new URLSearchParams(searchParams.toString());
    params.set('task', task.id);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(null, '', newUrl);
  }, [searchParams]); // removed router dep as we use history API for this specific interaction

  // Handle closing detail modal
  const handleDetailModalClose = useCallback((open: boolean) => {
    setIsDetailModalOpen(open);
    if (!open) {
      // Do not clear selectedTask here to allow the modal to animate out with content
      // setSelectedTask(null); 
      const params = new URLSearchParams(searchParams.toString());
      params.delete('task');
      const newUrl = params.toString() ? `/tasks?${params.toString()}` : '/tasks';
      // Use history API to clean URL without triggering Next.js navigation/re-render
      window.history.pushState(null, '', newUrl);
    }
  }, [searchParams]); // removed router dep

  // Open task from URL query param
  useEffect(() => {
    // Verify against real URL because searchParams might be stale due to manual history manipulation
    // This prevents the "Zombie Re-open" bug where closing via pushState causes this effect to re-open
    // because Next.js searchParams hasn't updated yet.
    if (typeof window === 'undefined') return;

    const currentParams = new URLSearchParams(window.location.search);
    const urlHasTask = currentParams.has('task');
    const taskId = searchParams.get('task');

    if (taskId && urlHasTask && tasks.length > 0 && !isDetailModalOpen) {
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
    description: editingTask.description || "",
    type: editingTask.type,
    priority: editingTask.priority,
    status: editingTask.status,
    points: editingTask.points?.toString(),
    modules: editingTask.modules,
    featureId: editingTask.feature.id
  } : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <div className="space-y-4">
          {/* Filters Skeleton */}
          <div className="flex gap-4 mb-4">
            <div className="h-10 w-64 bg-muted rounded animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>
          <KanbanBoardSkeleton />
        </div>
      </div>
    );
  }

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
            onClick={() => refetch()}
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
        modules={modules} // This is fallback fallbackModules, kept for comp
        defaultValues={{
          status: filters.status !== 'all' ? filters.status : undefined,
          priority: filters.priority !== 'all' ? filters.priority : undefined,
          modules: filters.module !== 'all' ? [filters.module] : undefined,
          featureId: filters.featureId !== 'all' ? filters.featureId : undefined,
        }}
        taskToEdit={taskToEditForDialog}
        onSuccess={refetch}
      />

      {/* Filters */}
      <TaskFilters
        filters={filters}
        onChange={handleFiltersChange}
        modules={modules}
        projects={projects}
        epics={epics}
        features={features}
      />

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/50">
          <p>Erro ao carregar tasks: {error instanceof Error ? error.message : 'Erro desconhecido'}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
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
