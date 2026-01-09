'use client';

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskRow } from './task-row';
import type { TaskWithReadableId } from '@/shared/types';

interface BlockedBlockProps {
  tasks: TaskWithReadableId[];
  teamView?: boolean;
}

/**
 * BlockedBlock - Bloco "Bloqueios" da dashboard
 * 
 * Mostra tasks bloqueadas.
 * - teamView=false: apenas minhas tasks bloqueadas
 * - teamView=true: todos os bloqueios dos projetos da equipe
 * 
 * Se não houver bloqueios, não renderiza nada.
 */
export function BlockedBlock({ tasks, teamView = false }: BlockedBlockProps) {
  // Filtrar apenas tasks bloqueadas
  const blockedTasks = useMemo(() => {
    return tasks.filter((task) => task.blocked);
  }, [tasks]);

  // Se não houver bloqueios, não renderiza o bloco
  if (blockedTasks.length === 0) {
    return null;
  }

  return (
    <Card className="border-red-500/30 bg-red-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-red-500">
          <AlertTriangle className="h-5 w-5" />
          Bloqueios
          <span className="text-sm font-normal ml-auto">
            {blockedTasks.length} {blockedTasks.length === 1 ? 'bloqueio' : 'bloqueios'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {blockedTasks.map((task) => (
            <TaskRow key={task.id} task={task} showAssignee={teamView} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
