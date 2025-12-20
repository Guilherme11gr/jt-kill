/**
 * Comment Repository - Prisma Adapter
 */
import type { PrismaClient, Comment as PrismaComment } from '@prisma/client';

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommentInput {
  orgId: string;
  taskId: string;
  userId: string;
  content: string;
}

export interface CommentWithUser extends Comment {
  user?: {
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export class CommentRepository {
  constructor(private prisma: PrismaClient) { }

  /**
   * Create a new comment
   */
  async create(data: CreateCommentInput): Promise<Comment> {
    return this.prisma.comment.create({
      data: {
        orgId: data.orgId,
        taskId: data.taskId,
        userId: data.userId,
        content: data.content,
      },
    });
  }

  /**
   * Find all comments for a task
   */
  async findByTaskId(taskId: string, orgId: string): Promise<CommentWithUser[]> {
    const comments = await this.prisma.comment.findMany({
      where: {
        taskId,
        orgId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Fetch user profiles for the comments
    const userIds = [...new Set(comments.map((c: PrismaComment) => c.userId))];
    const profiles = await this.prisma.userProfile.findMany({
      where: {
        id: { in: userIds },
        orgId,
      },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    const profileMap = new Map(profiles.map(p => [p.id, p]));

    return comments.map((comment: PrismaComment) => ({
      ...comment,
      user: profileMap.get(comment.userId) || undefined,
    }));
  }

  /**
   * Find comment by ID
   */
  async findById(id: string, orgId: string): Promise<Comment | null> {
    return this.prisma.comment.findFirst({
      where: { id, orgId },
    });
  }

  /**
   * Update comment content
   */
  async update(id: string, orgId: string, content: string): Promise<Comment> {
    return this.prisma.comment.update({
      where: { id },
      data: { content },
    });
  }

  /**
   * Delete a comment
   */
  async delete(id: string, orgId: string): Promise<void> {
    await this.prisma.comment.delete({
      where: { id },
    });
  }

  /**
   * Count comments for a task
   */
  async countByTaskId(taskId: string, orgId: string): Promise<number> {
    return this.prisma.comment.count({
      where: { taskId, orgId },
    });
  }
}
