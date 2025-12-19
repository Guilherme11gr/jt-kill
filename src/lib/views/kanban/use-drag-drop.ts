'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent as DndDragEndEvent,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import type { TaskStatus, TaskWithReadableId } from '@/shared/types';

interface UseDragDropOptions {
  tasks: TaskWithReadableId[];
  onDragEnd: (taskId: string, newStatus: TaskStatus) => Promise<void>;
}

interface UseDragDropReturn {
  DndContextProvider: typeof DndContext;
  DragOverlayComponent: typeof DragOverlay;
  sensors: ReturnType<typeof useSensors>;
  modifiers: typeof restrictToWindowEdges[];
  activeTask: TaskWithReadableId | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DndDragEndEvent) => void;
  collisionDetection: typeof closestCenter;
}

export function useDragDrop({ tasks, onDragEnd }: UseDragDropOptions): UseDragDropReturn {
  const [activeTask, setActiveTask] = useState<TaskWithReadableId | null>(null);

  // Sensors for pointer and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance to activate
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      if (task) {
        setActiveTask(task);
      }
    },
    [tasks]
  );

  const handleDragEnd = useCallback(
    async (event: DndDragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over || active.id === over.id) return;

      const taskId = active.id as string;
      const newStatus = over.id as TaskStatus;

      // Check if dropped on a valid column
      const validStatuses: TaskStatus[] = [
        'BACKLOG',
        'TODO',
        'DOING',
        'REVIEW',
        'QA_READY',
        'DONE',
      ];

      if (validStatuses.includes(newStatus)) {
        // Optimistic update happens in parent
        await onDragEnd(taskId, newStatus);
      }
    },
    [onDragEnd]
  );

  return {
    DndContextProvider: DndContext,
    DragOverlayComponent: DragOverlay,
    sensors,
    modifiers: [restrictToWindowEdges],
    activeTask,
    handleDragStart,
    handleDragEnd,
    collisionDetection: closestCenter,
  };
}
