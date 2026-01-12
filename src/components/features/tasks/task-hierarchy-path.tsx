'use client';

import { useMemo } from 'react';
import type { TaskWithReadableId } from '@/shared/types';

interface TaskHierarchyPathProps {
  task: TaskWithReadableId;
}

export function TaskHierarchyPath({ task }: TaskHierarchyPathProps) {
  const fullPath = useMemo(() => {
    const { feature } = task;
    if (!feature?.epic?.project) return null;
    
    return `${feature.epic.project.name} → ${feature.epic.title} → ${feature.title}`;
  }, [task.feature]);

  if (!fullPath) return null;

  return (
    <div 
      className="text-[10px] text-muted-foreground/60 truncate max-w-full leading-tight"
      title={fullPath}
    >
      {fullPath}
    </div>
  );
}
