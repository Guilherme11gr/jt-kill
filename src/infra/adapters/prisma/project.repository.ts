import { PrismaClient } from '@prisma/client';
import type { Project } from '@/shared/types';

export interface CreateProjectInput {
  orgId: string;
  name: string;
  key: string;
  description?: string | null;
  modules?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  // ⚠️ key é IMUTÁVEL após criação - não incluído
  description?: string | null;
  modules?: string[];
}

export class ProjectRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create project
   * @throws ConflictError if key already exists in org
   */
  async create(input: CreateProjectInput): Promise<Project> {
    return await this.prisma.project.create({
      data: {
        orgId: input.orgId,
        name: input.name,
        key: input.key.toUpperCase(), // Always uppercase
        description: input.description,
        modules: input.modules ?? [],
      },
    });
  }

  /**
   * Find all projects in org with epic/task counts
   * NO N+1: Single query with aggregations
   */
  async findMany(orgId: string): Promise<Array<Project & { _count: { epics: number; tasks: number } }>> {
    return await this.prisma.project.findMany({
      where: { orgId },
      include: {
        _count: {
          select: { epics: true, tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find project by ID with org isolation
   * @returns Project or null
   */
  async findById(id: string, orgId: string): Promise<Project | null> {
    return await this.prisma.project.findFirst({
      where: { id, orgId }, // Tenant isolation
    });
  }

  /**
   * Find project by key (unique per org)
   */
  async findByKey(key: string, orgId: string): Promise<Project | null> {
    return await this.prisma.project.findFirst({
      where: { 
        key: key.toUpperCase(),
        orgId 
      },
    });
  }

  /**
   * Update project
   * ⚠️ key é IMUTÁVEL - não pode ser alterado
   * @throws NotFoundError if not found or different org
   */
  async update(
    id: string,
    orgId: string,
    input: UpdateProjectInput
  ): Promise<Project> {
    // Use updateMany to validate orgId, then fetch updated record
    const result = await this.prisma.project.updateMany({
      where: { id, orgId },
      data: input,
    });
    
    if (result.count === 0) {
      throw new Error('Project not found');
    }
    
    // Re-fetch to return full object
    const updated = await this.findById(id, orgId);
    if (!updated) throw new Error('Project not found');
    return updated;
  }

  /**
   * Delete project (cascade deletes epics, features, tasks)
   * @returns true if deleted, false if not found or different org
   */
  async delete(id: string, orgId: string): Promise<boolean> {
    const result = await this.prisma.project.deleteMany({
      where: { id, orgId },
    });
    return result.count > 0;
  }

  /**
   * Count projects in org
   */
  async count(orgId: string): Promise<number> {
    return await this.prisma.project.count({
      where: { orgId },
    });
  }
}
