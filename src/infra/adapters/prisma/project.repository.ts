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
  constructor(private prisma: PrismaClient) { }

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

  async count(orgId: string): Promise<number> {
    return await this.prisma.project.count({
      where: { orgId },
    });
  }

  /**
   * Find all projects with rich analytics for Dashboard
   * - Optimized to avoid N+1
   * - Includes: Facepile (recent assignees), Progress (Done/Total)
   */
  async findManyWithAnalytics(orgId: string) {
    // 1. Projects + Recent Activity (Top 5 tasks)
    const projects = await this.prisma.project.findMany({
      where: { orgId },
      include: {
        _count: {
          select: { epics: true, tasks: true },
        },
        tasks: {
          take: 5,
          where: { assigneeId: { not: null } }, // Only assigned tasks for facepile
          orderBy: { updatedAt: 'desc' },
          select: {
            updatedAt: true,
            assignee: {
              select: {
                id: true,
                user_profiles: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }, // Push alive projects to top
    });

    // 2. Stats Aggregation (for Pulse Metrics)
    // Group by Project, Status AND Blocked flag
    const stats = await this.prisma.task.groupBy({
      by: ['projectId', 'status', 'blocked'],
      where: { orgId },
      _count: true,
    });

    // 3. Merge & Transform
    return projects.map(p => {
      const pStats = stats.filter(s => s.projectId === p.id);

      // Calculate Metrics
      // Active = DOING or REVIEW (and NOT blocked)
      const activeCount = pStats
        .filter(s => (s.status === 'DOING' || s.status === 'REVIEW') && s.blocked === false)
        .reduce((acc, curr) => acc + curr._count, 0);

      // Blocked = Any task that is blocked
      const blockedCount = pStats
        .filter(s => s.blocked === true)
        .reduce((acc, curr) => acc + curr._count, 0);

      // Done count for progress (optional, but good to keep if needed or for sort)
      const doneTasks = pStats
        .filter(s => s.status === 'DONE')
        .reduce((acc, curr) => acc + curr._count, 0);

      const totalTasks = p._count.tasks;
      const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      // Calculate Facepile (Unique Assignees)
      type UserProfile = { displayName: string; avatarUrl: string | null };
      const uniqueAssignees = new Map<string, UserProfile>();

      p.tasks.forEach(t => {
        if (t.assignee?.user_profiles) {
          const profile = t.assignee.user_profiles;
          if (!uniqueAssignees.has(profile.displayName)) {
            uniqueAssignees.set(profile.displayName, profile);
          }
        }
      });

      return {
        ...p,
        progress, // Keep generic progress as fallback or sorting
        activeCount,
        blockedCount,
        recentAssignees: Array.from(uniqueAssignees.values()).slice(0, 4) // Top 4 faces
      };
    });
  }
}
