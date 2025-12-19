import type { TaskStatus, TaskWithReadableId } from '@/shared/types';

// Kanban view types
export interface KanbanColumn {
  status: TaskStatus;
  tasks: TaskWithReadableId[];
}

export interface DragEndEvent {
  taskId: string;
  sourceStatus: TaskStatus;
  destinationStatus: TaskStatus;
}

export interface KanbanBoardProps {
  tasks: TaskWithReadableId[];
  onTaskMove: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onTaskClick?: (task: TaskWithReadableId) => void;
  isLoading?: boolean;
}

export interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskWithReadableId[];
  onTaskClick?: (task: TaskWithReadableId) => void;
}

// Column order
export const KANBAN_COLUMNS: TaskStatus[] = [
  'BACKLOG',
  'TODO',
  'DOING',
  'REVIEW',
  'QA_READY',
  'DONE',
];

// Group tasks by status
export function groupTasksByStatus(
  tasks: TaskWithReadableId[]
): Record<TaskStatus, TaskWithReadableId[]> {
  const grouped: Record<TaskStatus, TaskWithReadableId[]> = {
    BACKLOG: [],
    TODO: [],
    DOING: [],
    REVIEW: [],
    QA_READY: [],
    DONE: [],
  };

  tasks.forEach((task) => {
    grouped[task.status].push(task);
  });

  return grouped;
}
