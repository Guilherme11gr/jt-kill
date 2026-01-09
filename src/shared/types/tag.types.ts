// TaskTag entity and related types

export interface TaskTag {
  id: string;
  orgId: string;
  projectId: string;
  name: string;
  color: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskTagWithCounts extends TaskTag {
  taskCount: number;
  featureCount: number;
}

// Lightweight tag for embedding in task/feature responses
export interface TagInfo {
  id: string;
  name: string;
  color: string;
}

// Input types for CRUD operations
export interface CreateTaskTagInput {
  projectId: string;
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateTaskTagInput {
  name?: string;
  color?: string;
  description?: string | null;
}
