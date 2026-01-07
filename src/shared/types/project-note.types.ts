/**
 * Project Note Types
 */

export enum NoteStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  CONVERTED = 'CONVERTED',
}

export interface ProjectNote {
  id: string;
  orgId: string;
  projectId: string;
  title: string;
  content: string;
  status: NoteStatus;
  convertedToFeatureId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  convertedToFeature?: {
    id: string;
    title: string;
  } | null;
}

export interface CreateProjectNoteInput {
  projectId: string;
  title: string;
  content: string;
}

export interface UpdateProjectNoteInput {
  id: string;
  title?: string;
  content?: string;
}
