/**
 * @fileoverview Tipos de domínio principais
 */

// ============================================================================
// Enums
// ============================================================================

export type TaskStatus = 'BACKLOG' | 'TODO' | 'DOING' | 'REVIEW' | 'QA_READY' | 'DONE';

export type TaskType = 'TASK' | 'BUG';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EpicStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type FeatureStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';

// ============================================================================
// Entidades
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  key: string;
  modules: string[];
  createdAt: Date;
}

export interface ProjectDoc {
  id: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Epic {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: EpicStatus;
  createdAt: Date;
}

export interface Feature {
  id: string;
  epicId: string;
  title: string;
  description?: string;
  status: FeatureStatus;
  createdAt: Date;
}

export interface Task {
  id: string;
  featureId: string;
  key: string;
  title: string;
  description?: string;
  status: TaskStatus;
  type: TaskType;
  points?: number;
  priority: Priority;
  module?: string;
  assigneeId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PokerVote {
  id: string;
  taskId: string;
  userId: string;
  vote: number;
  createdAt: Date;
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreateTaskInput {
  featureId: string;
  title: string;
  description?: string;
  type: TaskType;
  priority?: Priority;
  module?: string;
  assigneeId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  module?: string;
  assigneeId?: string;
  points?: number;
}

export interface CreateProjectInput {
  orgId: string;
  name: string;
  key: string;
  modules?: string[];
}

export interface CreateEpicInput {
  projectId: string;
  title: string;
  description?: string;
}

export interface CreateFeatureInput {
  epicId: string;
  title: string;
  description?: string;
}

// ============================================================================
// AI Scribe
// ============================================================================

export interface GenerateTasksInput {
  projectId: string;
  epicId: string;
  brainDump: string;
}

export interface GeneratedTask {
  title: string;
  description: string;
  type: TaskType;
  module?: string;
  priority: Priority;
}

export interface GenerateTasksOutput {
  feature: {
    title: string;
    description: string;
  };
  tasks: GeneratedTask[];
}

// ============================================================================
// Poker
// ============================================================================

export interface PokerStats {
  average: number;
  median: number;
  suggested: number;
  votes: number[];
}

// ============================================================================
// User (do Supabase Auth)
// ============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

// ============================================================================
// Task com relações (para UI)
// ============================================================================

export interface TaskWithAssignee extends Task {
  assignee?: User;
}

export interface FeatureWithTasks extends Feature {
  tasks: Task[];
}

export interface EpicWithFeatures extends Epic {
  features: Feature[];
}

export interface ProjectWithEpics extends Project {
  epics: Epic[];
}
