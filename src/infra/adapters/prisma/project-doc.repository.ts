/**
 * ProjectDoc Repository - Prisma Adapter
 */
import type { PrismaClient, ProjectDoc as PrismaProjectDoc } from '@prisma/client';

export interface ProjectDoc {
  id: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
}

export interface CreateProjectDocInput {
  orgId: string;
  projectId: string;
  title: string;
  content: string;
}

export interface UpdateProjectDocInput {
  title?: string;
  content?: string;
}

export class ProjectDocRepository {
  constructor(private prisma: PrismaClient) { }

  /**
   * Create a new project doc
   */
  async create(data: CreateProjectDocInput): Promise<ProjectDoc> {
    return this.prisma.projectDoc.create({
      data: {
        orgId: data.orgId,
        projectId: data.projectId,
        title: data.title,
        content: data.content,
      },
    });
  }

  /**
   * Find all docs for a project
   */
  async findByProjectId(projectId: string, orgId: string): Promise<ProjectDoc[]> {
    return this.prisma.projectDoc.findMany({
      where: {
        projectId,
        orgId,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * Find doc by ID
   */
  async findById(id: string, orgId: string): Promise<ProjectDoc | null> {
    return this.prisma.projectDoc.findFirst({
      where: { id, orgId },
    });
  }

  /**
   * Find doc by ID with tags included
   */
  async findByIdWithTags(id: string, orgId: string) {
    return this.prisma.projectDoc.findFirst({
      where: { id, orgId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
  }

  /**
   * Update a project doc
   */
  async update(id: string, orgId: string, data: UpdateProjectDocInput): Promise<ProjectDoc> {
    // Verify belongs to org
    const existing = await this.findById(id, orgId);
    if (!existing) {
      throw new Error('ProjectDoc not found');
    }

    return this.prisma.projectDoc.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a doc
   */
  async delete(id: string, orgId: string): Promise<void> {
    // Verify belongs to org before delete
    const existing = await this.findById(id, orgId);
    if (!existing) {
      throw new Error('ProjectDoc not found');
    }

    await this.prisma.projectDoc.delete({
      where: { id },
    });
  }

  /**
   * Count docs for a project
   */
  async countByProjectId(projectId: string, orgId: string): Promise<number> {
    return this.prisma.projectDoc.count({
      where: { projectId, orgId },
    });
  }

  /**
   * Find docs for AI context (limited by character count)
   * Returns docs ordered by most recent, with content limited to maxTotalChars
   */
  async findForAIContext(
    projectId: string,
    orgId: string,
    maxTotalChars: number = 4000
  ): Promise<Array<{ title: string; content: string }>> {
    const docs = await this.prisma.projectDoc.findMany({
      where: { projectId, orgId },
      select: { title: true, content: true },
      orderBy: { updatedAt: 'desc' },
    });

    // Limit total characters across all docs
    const result: Array<{ title: string; content: string }> = [];
    let totalChars = 0;

    for (const doc of docs) {
      const docChars = doc.title.length + doc.content.length + 10; // +10 for separators

      if (totalChars + docChars > maxTotalChars) {
        // Check if we can add a truncated version
        const remainingChars = maxTotalChars - totalChars - doc.title.length - 20;
        if (remainingChars > 100) {
          result.push({
            title: doc.title,
            content: doc.content.substring(0, remainingChars) + '...',
          });
        }
        break;
      }

      result.push({ title: doc.title, content: doc.content });
      totalChars += docChars;
    }

    return result;
  }
}
