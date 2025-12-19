// Project status types
export type EpicStatus = 'OPEN' | 'CLOSED';
export type FeatureStatus = 'BACKLOG' | 'TODO' | 'DOING' | 'DONE';
export type TaskStatus = 'BACKLOG' | 'TODO' | 'DOING' | 'REVIEW' | 'QA_READY' | 'DONE';
export type TaskType = 'TASK' | 'BUG';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PokerStatus = 'VOTING' | 'REVEALED' | 'CLOSED';

// Fibonacci points
export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13 | 21 | null;
export type PokerVote = 0 | 1 | 2 | 3 | 5 | 8 | 13 | 21; // 0 = "?"

// Organization (Tenant)
export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

// Project
export interface Project {
  id: string;
  orgId: string;
  name: string;
  key: string; // Prefix for task IDs (APP, SDK, etc)
  description: string | null;
  modules: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Epic
export interface Epic {
  id: string;
  orgId: string;
  projectId: string;
  title: string;
  description: string | null;
  status: EpicStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Feature
export interface Feature {
  id: string;
  orgId: string;
  epicId: string;
  title: string;
  description: string | null;
  status: FeatureStatus;
  createdAt: Date;
  updatedAt: Date;
}
