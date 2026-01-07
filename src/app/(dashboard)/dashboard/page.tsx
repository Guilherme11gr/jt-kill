'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bug,
  CheckSquare,
  Layers,
  RefreshCw,
  Loader2,
  ArrowRight,
  Target,
  Inbox,
} from 'lucide-react';
import Link from 'next/link';
import type { TaskWithReadableId, TaskStatus } from '@/shared/types';
import { useTasks } from '@/lib/query';
import { PageHeaderSkeleton, CardsSkeleton, SingleColumnSkeleton } from '@/components/layout/page-skeleton';

// Priority order for status (lower = higher priority)
const statusPriority: Record<TaskStatus, number> = {
  DOING: 1,
  REVIEW: 2,
  TODO: 3,
  QA_READY: 4,
  BACKLOG: 5,
  DONE: 6,
};

// Priority order for task priority
const priorityOrder: Record<string, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
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

// Status badge variants
const statusVariantMap: Record<string, 'outline' | 'outline-success' | 'outline-info' | 'outline-purple' | 'outline-warning'> = {
  BACKLOG: 'outline',
  TODO: 'outline',
  DOING: 'outline-info',
  REVIEW: 'outline-purple',
  QA_READY: 'outline-warning',
  DONE: 'outline-success',
};

// Task card component for the dashboard
function DashboardTaskCard({ task }: { task: TaskWithReadableId }) {
  const isBug = task.type === 'BUG';

  return (
    <Link href={`/tasks?task=${task.id}`}>
      <Card
        className={`cursor-pointer hover:border-primary/50 transition-all ${isBug ? 'border-red-500/50 hover:border-red-500' : ''
          }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-1.5 rounded ${isBug ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
              {isBug ? (
                <Bug className="h-4 w-4 text-red-500" />
              ) : (
                <CheckSquare className="h-4 w-4 text-blue-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">
                  {task.readableId}
                </Badge>
                <Badge variant={statusVariantMap[task.status] || 'outline'} className="text-xs">
                  {statusLabels[task.status] || task.status}
                </Badge>
                {task.points && (
                  <Badge variant="secondary" className="text-xs">
                    {task.points}pts
                  </Badge>
                )}
              </div>
              <h4 className="font-medium text-sm truncate">{task.title}</h4>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {task.feature.epic.title} → {task.feature.title}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Project section component
function ProjectSection({
  projectId,
  projectName,
  projectKey,
  tasks,
}: {
  projectId: string;
  projectName: string;
  projectKey: string;
  tasks: TaskWithReadableId[];
}) {
  // Count bugs and other stats
  const bugCount = tasks.filter(t => t.type === 'BUG').length;
  const doingCount = tasks.filter(t => t.status === 'DOING').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link 
          href={`/projects/${projectId}`}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
        >
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold group-hover:underline">{projectName}</h3>
          <Badge variant="outline" className="text-xs font-mono">
            {projectKey}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {tasks.length} tasks
          </Badge>
        </Link>
        <div className="flex gap-2">
          {bugCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {bugCount} bugs
            </Badge>
          )}
          {doingCount > 0 && (
            <Badge variant="outline-info" className="text-xs">
              {doingCount} em andamento
            </Badge>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map(task => (
          <DashboardTaskCard
            key={task.id}
            task={task}
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  // Use React Query for shared cache with Kanban
  const { data, isLoading, error, refetch, isFetching } = useTasks();

  // Filter out DONE tasks for "My Focus" view
  const tasks = useMemo((): TaskWithReadableId[] => {
    return (data?.items ?? []).filter(
      (t: TaskWithReadableId) => t.status !== 'DONE'
    );
  }, [data?.items]);

  // Sort tasks: Bugs first, then by status priority, then by priority
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Bugs first
      if (a.type === 'BUG' && b.type !== 'BUG') return -1;
      if (a.type !== 'BUG' && b.type === 'BUG') return 1;

      // Then by status priority
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Then by priority
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [tasks]);

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const groups: Record<string, { projectName: string; projectKey: string; tasks: TaskWithReadableId[] }> = {};

    sortedTasks.forEach(task => {
      const projectId = task.feature.epic.project.id;
      if (!groups[projectId]) {
        groups[projectId] = {
          projectName: task.feature.epic.project.name,
          projectKey: task.feature.epic.project.key,
          tasks: [],
        };
      }
      groups[projectId].tasks.push(task);
    });

    // Sort projects: projects with bugs first, then by task count
    return Object.entries(groups).sort(([, groupA], [, groupB]) => {
      const bugsA = groupA.tasks.filter(t => t.type === 'BUG').length;
      const bugsB = groupB.tasks.filter(t => t.type === 'BUG').length;
      if (bugsA !== bugsB) return bugsB - bugsA;
      return groupB.tasks.length - groupA.tasks.length;
    });
  }, [sortedTasks]);

  // Stats
  const stats = useMemo(() => {
    const bugCount = tasks.filter(t => t.type === 'BUG').length;
    const doingCount = tasks.filter(t => t.status === 'DOING').length;
    const reviewCount = tasks.filter(t => t.status === 'REVIEW').length;
    const todoCount = tasks.filter(t => t.status === 'TODO').length;
    return { bugCount, doingCount, reviewCount, todoCount, total: tasks.length };
  }, [tasks]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            My Focus
          </h1>
          <p className="text-muted-foreground">
            Suas tarefas ativas, organizadas por prioridade
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          <Link href="/tasks">
            <Button variant="outline" className="gap-2">
              Ver Kanban
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/tasks?type=BUG">
          <Card className={`cursor-pointer hover:border-red-500 transition-all ${stats.bugCount > 0 ? 'border-red-500/50' : ''}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bugs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.bugCount}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/tasks?status=DOING">
          <Card className="cursor-pointer hover:border-blue-500 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.doingCount}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/tasks?status=REVIEW">
          <Card className="cursor-pointer hover:border-purple-500 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Revisão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">{stats.reviewCount}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/tasks?status=TODO">
          <Card className="cursor-pointer hover:border-primary transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                A Fazer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">{stats.todoCount}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/50">
          <p>Erro ao carregar tasks: {error.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <>
          <PageHeaderSkeleton />
          <CardsSkeleton count={4} />
          <div className="mt-8 space-y-8">
            <SingleColumnSkeleton />
            <SingleColumnSkeleton />
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && !error && tasks.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Inbox className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma tarefa ativa</h3>
            <p className="text-muted-foreground mb-4">
              Todas as suas tarefas estão concluídas! 🎉
            </p>
            <Link href="/tasks">
              <Button className="gap-2">
                Ver todas as tasks
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Tasks grouped by project */}
      {!isLoading && !error && tasksByProject.length > 0 && (
        <div className="space-y-8">
          {tasksByProject.map(([projectId, { projectName, projectKey, tasks: projectTasks }]) => (
            <ProjectSection
              key={projectId}
              projectId={projectId}
              projectName={projectName}
              projectKey={projectKey}
              tasks={projectTasks}
            />
          ))}
        </div>
      )}
    </div>
  );
}
