/**
 * ProjectNote Repository - Prisma Adapter
 */
import type { PrismaClient, NoteStatus as PrismaNoteStatus } from '@prisma/client';

export interface ProjectNote {
  id: string;
  projectId: string;
  title: string;
  content: string;
  status: PrismaNoteStatus;
  convertedToFeatureId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  convertedToFeature?: {
    id: string;
    title: string;
  } | null;
}

export interface CreateProjectNoteInput {
  orgId: string;
  projectId: string;
  title: string;
  content: string;
}

export interface UpdateProjectNoteInput {
  title?: string;
  content?: string;
}

export class ProjectNoteRepository {
  constructor(private prisma: PrismaClient) { }

  /**
   * Create a new project note
   */
  async create(data: CreateProjectNoteInput): Promise<ProjectNote> {
    return this.prisma.projectNote.create({
      data: {
        orgId: data.orgId,
        projectId: data.projectId,
        title: data.title,
        content: data.content,
      },
    });
  }

  /**
   * Find all notes for a project, optionally filtered by status
   */
  async findByProjectId(
    projectId: string,
    orgId: string,
    status?: PrismaNoteStatus
  ): Promise<ProjectNote[]> {
    return this.prisma.projectNote.findMany({
      where: {
        projectId,
        orgId,
        ...(status ? { status } : {}),
      },
      include: {
        convertedToFeature: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * Find note by ID
   */
  async findById(id: string, orgId: string): Promise<ProjectNote | null> {
    return this.prisma.projectNote.findFirst({
      where: { id, orgId },
      include: {
        convertedToFeature: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Update a project note
   */
  async update(
    id: string,
    orgId: string,
    data: UpdateProjectNoteInput
  ): Promise<ProjectNote> {
    // Verify belongs to org
    const existing = await this.findById(id, orgId);
    if (!existing) {
      throw new Error('ProjectNote not found');
    }

    return this.prisma.projectNote.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a note permanently
   */
  async delete(id: string, orgId: string): Promise<void> {
    // Verify belongs to org before delete
    const existing = await this.findById(id, orgId);
    if (!existing) {
      throw new Error('ProjectNote not found');
    }

    await this.prisma.projectNote.delete({
      where: { id },
    });
  }

  /**
   * Archive a note (single query)
   */
  async archive(id: string, orgId: string): Promise<ProjectNote> {
    // Use updateMany with where to ensure org ownership in a single query
    const result = await this.prisma.projectNote.updateMany({
      where: { id, orgId },
      data: { status: 'ARCHIVED' },
    });

    if (result.count === 0) {
      throw new Error('ProjectNote not found');
    }

    // Return the updated note
    return this.prisma.projectNote.findUniqueOrThrow({ where: { id } });
  }

  /**
   * Unarchive a note (single query)
   */
  async unarchive(id: string, orgId: string): Promise<ProjectNote> {
    const result = await this.prisma.projectNote.updateMany({
      where: { id, orgId },
      data: { status: 'ACTIVE' },
    });

    if (result.count === 0) {
      throw new Error('ProjectNote not found');
    }

    return this.prisma.projectNote.findUniqueOrThrow({ where: { id } });
  }

  /**
   * Convert a note to a feature (mark as converted)
   */
  async convertToFeature(
    id: string,
    orgId: string,
    featureId: string
  ): Promise<ProjectNote> {
    const existing = await this.findById(id, orgId);
    if (!existing) {
      throw new Error('ProjectNote not found');
    }

    return this.prisma.projectNote.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedToFeatureId: featureId,
      },
      include: {
        convertedToFeature: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Count notes for a project
   */
  async countByProjectId(
    projectId: string,
    orgId: string,
    status?: PrismaNoteStatus
  ): Promise<number> {
    return this.prisma.projectNote.count({
      where: {
        projectId,
        orgId,
        ...(status ? { status } : {}),
      },
    });
  }
}
