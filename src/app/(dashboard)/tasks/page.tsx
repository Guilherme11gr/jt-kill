'use client';

import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from 'react';
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
import type { TaskWithReadableId, TaskStatus, TaskPriority } from '@/shared/types';
import {
  useTasks,
  useProjects,
  useModules,
  useMoveTask,
  useDeleteTask,
  useAllFeatures,
} from '@/lib/query';
import { useAllEpics } from '@/lib/query/hooks/use-epics';
import { useUsers, useCurrentUser } from '@/lib/query/hooks/use-users';

function TasksPageContent() {
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
    Sanitization: valores inválidos defaultam para 'all'
  */
  const [filters, setFilters] = useState<TaskFiltersState>(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Sanitize status
    const statusParam = params.get('status');
    const validStatuses = ['BACKLOG', 'TODO', 'DOING', 'REVIEW', 'QA_READY', 'DONE'];
    const status = statusParam && validStatuses.includes(statusParam) ? statusParam as TaskStatus : 'all';

    // Sanitize priority
    const priorityParam = params.get('priority');
    const validPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const priority = priorityParam && validPriorities.includes(priorityParam) ? priorityParam as TaskPriority : 'all';

    return {
      search: params.get('search') || '',
      status,
      priority,
      module: params.get('module') || 'all',
      projectId: params.get('projectId') || 'all',
      epicId: params.get('epicId') || 'all',
      featureId: params.get('featureId') || 'all',
      assigneeId: params.get('assigneeId') || 'all',
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
    syncParam('assigneeId', newFilters.assigneeId);

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
  // We use a ref to track the last synced URL to avoid unnecessary re-renders
  const lastSyncedUrl = useRef<string>('');

  useEffect(() => {
    const currentUrl = searchParams.toString();

    // Skip if URL hasn't changed (avoids cascading renders)
    if (lastSyncedUrl.current === currentUrl) return;
    lastSyncedUrl.current = currentUrl;

    const params = new URLSearchParams(currentUrl);

    // Sanitize status
    const statusParam = params.get('status');
    const validStatuses = ['BACKLOG', 'TODO', 'DOING', 'REVIEW', 'QA_READY', 'DONE'];
    const status = statusParam && validStatuses.includes(statusParam) ? statusParam as TaskStatus : 'all';

    // Sanitize priority
    const priorityParam = params.get('priority');
    const validPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const priority = priorityParam && validPriorities.includes(priorityParam) ? priorityParam as TaskPriority : 'all';

    // Construct what the state SHOULD be based on URL (sanitized)
    const urlFilters: TaskFiltersState = {
      search: params.get('search') || '',
      status,
      priority,
      module: params.get('module') || 'all',
      projectId: params.get('projectId') || 'all',
      epicId: params.get('epicId') || 'all',
      featureId: params.get('featureId') || 'all',
      assigneeId: params.get('assigneeId') || 'all',
    };

    // ⚠️ INTENTIONAL: setState in effect is NECESSARY for browser back/forward sync
    // This is the correct pattern for URL-driven state (not a data fetching effect)
    setFilters(urlFilters);
  }, [searchParams]);

  // React Query hooks for shared cache
  const { data: tasksData, isLoading, error, refetch } = useTasks();
  const { data: projectsData } = useProjects();
  const { data: epicsData } = useAllEpics();
  const { data: featuresData } = useAllFeatures();
  const { data: modulesData } = useModules();
  const { data: usersData } = useUsers();
  const { data: currentUser } = useCurrentUser();

  // Mutations
  const moveTaskMutation = useMoveTask();
  const deleteTaskMutation = useDeleteTask();

  // Derived data
  const tasks = useMemo(() => tasksData?.items ?? [], [tasksData]);
  const projects = projectsData ?? [];
  const epics = epicsData ?? [];
  const features = featuresData ?? [];
  const modules = modulesData ?? [];
  const members = usersData ?? [];

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

      // Assignee
      if (filters.assigneeId !== 'all') {
        if (filters.assigneeId === 'me') {
          // "Minhas Tasks" - filtrar pelo usuário logado
          // Se currentUser não carregou ainda, não filtrar (evita flash de conteúdo vazio)
          if (currentUser && task.assigneeId !== currentUser.id) return false;
        } else {
          // Filtrar por membro específico
          if (task.assigneeId !== filters.assigneeId) return false;
        }
      }

      return true;
    });
  }, [tasks, filters, currentUser]);

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

      // CRITICAL: Use window.location.search directly to avoid stale searchParams race condition
      const params = new URLSearchParams(window.location.search);
      params.delete('task');
      const newUrl = params.toString() ? `/tasks?${params.toString()}` : '/tasks';
      // Use history API to clean URL without triggering Next.js navigation/re-render
      window.history.pushState(null, '', newUrl);
    }
  }, []); // No deps - uses window.location directly

  // Open task from URL query param (Deep Link)
  useEffect(() => {
    // Verify against real URL because searchParams might be stale due to manual history manipulation
    // This prevents the "Zombie Re-open" bug where closing via pushState causes this effect to re-open
    // because Next.js searchParams hasn't updated yet.
    if (typeof window === 'undefined') return;

    const currentParams = new URLSearchParams(window.location.search);
    const urlHasTask = currentParams.has('task');
    const taskId = searchParams.get('task');

    if (taskId && urlHasTask && tasks.length > 0 && !isDetailModalOpen) {
      // CRITICAL: Search in ALL tasks (not filteredTasks) to support deep links with filters
      // Example: /tasks?task=uuid&assigneeId=me should open even if task is not assigned to me
      const task = tasks.find(t => t.id === taskId);

      if (task) {
        // ⚠️ INTENTIONAL: setState in effect is NECESSARY for deep linking
        // Opening task modal from URL param requires synchronous state update
        setSelectedTask(task);
        setIsDetailModalOpen(true);
      } else {
        // Task ID not found - clean URL to avoid broken state
        const params = new URLSearchParams(window.location.search);
        params.delete('task');
        const newUrl = params.toString() ? `/tasks?${params.toString()}` : '/tasks';
        window.history.replaceState(null, '', newUrl);
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
    featureId: editingTask.feature.id,
    assigneeId: editingTask.assigneeId,
    tags: editingTask.tags,
  } : null;

  // Only show skeleton on initial load (no cached data yet)
  // During refetch (isFetching), keep UI mounted to preserve modal state
  if (isLoading && tasks.length === 0) {
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
        members={members}
        currentUserId={currentUser?.id}
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
              <span className="font-medium text-foreground"> &ldquo;{taskToDelete?.title}&rdquo; </span>
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

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <div className="space-y-4">
          <div className="flex gap-4 mb-4">
            <div className="h-10 w-64 bg-muted rounded animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>
          <KanbanBoardSkeleton />
        </div>
      </div>
    }>
      <TasksPageContent />
    </Suspense>
  );
}
