'use client';

import Link from 'next/link';
import { FolderKanban, Bug, AlertTriangle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ActiveProject } from '@/lib/query/hooks/use-dashboard';

interface ActiveProjectsBlockProps {
  projects: ActiveProject[];
  isLoading?: boolean;
}

/**
 * ActiveProjectsBlock - Bloco "Projetos Ativos" da dashboard
 * 
 * Cards simples de projetos onde o usuário tem tasks ativas.
 * Ordenados por bugs > quantidade de tasks.
 */
export function ActiveProjectsBlock({ projects, isLoading }: ActiveProjectsBlockProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-muted-foreground" />
            Projetos Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-muted-foreground" />
          Projetos Ativos
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ProjectCardProps {
  project: ActiveProject;
}

function ProjectCard({ project }: ProjectCardProps) {
  const hasBugs = project.bugCount > 0;
  const hasBlocked = project.blockedCount > 0;

  return (
    <Link href={`/tasks?projectId=${project.id}`}>
      <div
        className={cn(
          'group p-4 rounded-lg border transition-all',
          'hover:border-primary/50 hover:bg-accent/30',
          hasBugs && 'border-red-500/30'
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            <Badge variant="outline" className="font-mono text-[10px] px-1.5 mt-1">
              {project.key}
            </Badge>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
          <span className="flex items-center gap-1">
            <FolderKanban className="h-3 w-3" />
            {project.taskCount} {project.taskCount === 1 ? 'task' : 'tasks'}
          </span>

          {hasBugs && (
            <span className="flex items-center gap-1 text-red-400 font-medium">
              <Bug className="h-3 w-3" />
              {project.bugCount} {project.bugCount === 1 ? 'bug' : 'bugs'}
            </span>
          )}

          {hasBlocked && (
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <AlertTriangle className="h-3 w-3" />
              {project.blockedCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
