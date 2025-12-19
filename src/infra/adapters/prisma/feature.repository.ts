import { PrismaClient } from '@prisma/client';
import type { Feature, FeatureStatus } from '@/shared/types';

export interface CreateFeatureInput {
  orgId: string;
  epicId: string;
  title: string;
  description?: string | null;
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

  async findAll(orgId: string): Promise<Feature[]> {
    return await this.prisma.feature.findMany({
      where: { orgId },
      orderBy: { title: 'asc' },
    });
  }

  async findById(id: string, orgId: string): Promise<Feature | null> {
    return await this.prisma.feature.findFirst({
      where: { id, orgId },
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
    const result = await this.prisma.feature.deleteMany({
      where: {
        id,
        epic: { project: { orgId } },
      },
    });
    return result.count > 0;
  }
}
