'use client';

import { useMemo } from 'react';
import { Target, Inbox } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskRow } from './task-row';
import type { TaskWithReadableId } from '@/shared/types';

interface TodayBlockProps {
  tasks: TaskWithReadableId[];
  isLoading?: boolean;
}

/**
 * TodayBlock - Bloco "Hoje" da dashboard
 * 
 * Mostra tasks do usuário ordenadas para ação:
 * - Bloqueadas primeiro
 * - Bugs
 * - Por prioridade
 * - Por última atualização
 * 
 * Exclui tasks bloqueadas (que aparecem no BlockedBlock).
 */
export function TodayBlock({ tasks, isLoading }: TodayBlockProps) {
  // Filtrar tasks não bloqueadas (bloqueadas vão no BlockedBlock)
  const todayTasks = useMemo(() => {
    return tasks.filter((task) => !task.blocked);
  }, [tasks]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Hoje
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (todayTasks.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma tarefa ativa
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Todas as suas tarefas estão concluídas! 🎉
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Hoje
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            {todayTasks.length} {todayTasks.length === 1 ? 'tarefa' : 'tarefas'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1 max-h-[350px] overflow-y-auto pr-2">
          {todayTasks.map((task) => (
            <TaskRow key={task.id} task={task} showProject />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
