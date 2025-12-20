/**
 * Project Doc Types
 */

export interface ProjectDoc {
  id: string;
  orgId: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateProjectDocInput {
  projectId: string;
  title: string;
  content: string;
}

export interface UpdateProjectDocInput {
  id: string;
  title?: string;
  content?: string;
}
