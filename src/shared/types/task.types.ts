import type { TaskStatus, TaskType, TaskPriority, StoryPoints } from './project.types';

// Base Task
export interface Task {
  id: string;
  orgId: string;
  projectId: string;
  featureId: string;
  localId: number; // Sequential ID per project
  title: string;
  description: string | null;
  status: TaskStatus;
  type: TaskType;
  priority: TaskPriority;
  points: StoryPoints;
  modules: string[];
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Task with human-readable ID (for display)
export interface TaskWithReadableId extends Task {
  readableId: string; // e.g., "APP-123"
  feature: {
    id: string;
    title: string;
    epic: {
      id: string;
      title: string;
      project: {
        id: string;
        name: string;
        key: string;
      };
    };
  };
}

// Task with relations (for detail view)
export interface TaskWithRelations extends Task {
  feature: {
    id: string;
    title: string;
    epic: {
      id: string;
      title: string;
      project: {
        id: string;
        name: string;
        key: string;
      };
    };
  };
  assignee: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

// Comment on task
export interface TaskComment {
  id: string;
  orgId: string;
  taskId: string;
  userId: string;
  content: string; // Markdown
  createdAt: Date;
  updatedAt: Date;
}

// Comment with author info
export interface TaskCommentWithAuthor extends TaskComment {
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

// Helper to build readable ID
export function buildReadableId(projectKey: string, localId: number): string {
  return `${projectKey}-${localId}`;
}
