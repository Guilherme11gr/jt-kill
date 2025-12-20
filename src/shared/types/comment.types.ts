/**
 * Comment Types
 */

export interface Comment {
  id: string;
  orgId: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CommentWithUser extends Comment {
  user?: {
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface CreateCommentInput {
  taskId: string;
  content: string;
}

export interface UpdateCommentInput {
  id: string;
  content: string;
}
