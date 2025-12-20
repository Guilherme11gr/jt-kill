import { PrismaClient } from '@prisma/client';
import type { Feature, FeatureStatus } from '@/shared/types';

export interface CreateFeatureInput {
  orgId: string;
  epicId: string;
  title: string;
  description?: string | null;
  isSystem?: boolean;
}

export interface UpdateFeatureInput {
  title?: string;
  description?: string | null;
  status?: FeatureStatus;
}

export class FeatureRepository {
  constructor(private prisma: PrismaClient) { }

  async create(input: CreateFeatureInput): Promise<Feature> {
    return await this.prisma.feature.create({
      data: input,
    });
  }

  /**
   * Find features with task counts
   * NO N+1: Aggregate in single query
   */
  async findManyWithStats(
    epicId: string,
    orgId: string
  ): Promise<Array<Feature & { _count: { tasks: number } }>> {
    return await this.prisma.feature.findMany({
      where: { epicId, orgId },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(orgId: string) {
    return await this.prisma.feature.findMany({
      where: { orgId },
      include: {
        epic: {
          select: {
            id: true,
            title: true,
            project: {
              select: {
                id: true,
                name: true,
                key: true,
              },
            },
          },
        },
      },
      orderBy: { title: 'asc' },
    });
  }

  async findById(id: string, orgId: string): Promise<Feature | null> {
    return await this.prisma.feature.findFirst({
      where: { id, orgId },
    });
  }

  /**
   * Find system feature (Sustentação) for a project
   * Used for orphan task assignment
   */
  async findSystemFeature(projectId: string): Promise<Feature | null> {
    return await this.prisma.feature.findFirst({
      where: {
        epic: { projectId },
        isSystem: true,
      },
    });
  }

  /**
   * Find feature with full breadcrumb (epic → project)
   */
  async findByIdWithBreadcrumb(
    id: string,
    orgId: string
  ): Promise<(Feature & { epic: { id: string; title: string; projectId: string } }) | null> {
    return await this.prisma.feature.findFirst({
      where: { id, orgId },
      include: {
        epic: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
      },
    });
  }

  /**
   * Find feature with full relations (epic → project)
   */
  async findByIdWithRelations(
    id: string,
    orgId: string
  ) {
    return await this.prisma.feature.findFirst({
      where: { id, orgId },
      include: {
        epic: {
          select: {
            id: true,
            title: true,
            project: {
              select: {
                id: true,
                name: true,
                key: true,
              },
            },
          },
        },
      },
    });
  }

  async update(
    id: string,
    orgId: string,
    input: UpdateFeatureInput
  ): Promise<Feature> {
    // Validate feature belongs to org before update
    const existing = await this.prisma.feature.findFirst({
      where: { id, epic: { project: { orgId } } },
    });

    if (!existing) {
      throw new Error('Feature not found');
    }

    return await this.prisma.feature.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string, orgId: string): Promise<boolean> {
    // Protect system features from deletion
    const feature = await this.prisma.feature.findFirst({
      where: { id, epic: { project: { orgId } } },
    });

    if (feature?.isSystem) {
      throw new Error('Feature de sistema não pode ser excluída');
    }

    const result = await this.prisma.feature.deleteMany({
      where: {
        id,
        epic: { project: { orgId } },
      },
    });
    return result.count > 0;
  }
}
