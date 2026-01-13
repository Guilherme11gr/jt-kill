import { PrismaClient, ProjectTag as PrismaProjectTag } from '@prisma/client';
import type { TaskTag, TaskTagWithCounts, TagInfo, CreateTaskTagInput, UpdateTaskTagInput } from '@/shared/types/tag.types';
import { NotFoundError, ValidationError } from '@/shared/errors';

function toDomain(raw: PrismaTaskTag): TaskTag {
  return {
    id: raw.id,
    orgId: raw.orgId,
    projectId: raw.projectId,
    name: raw.name,
    color: raw.color,
    description: raw.description,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export class TaskTagRepository {
  constructor(private prisma: PrismaClient) { }

  // ==================== CRUD ====================

  async create(orgId: string, input: CreateTaskTagInput): Promise<TaskTag> {
    // Validate project belongs to org
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, orgId },
    });
    if (!project) {
      throw new NotFoundError('Projeto não encontrado');
    }

    const tag = await this.prisma.projectTag.create({
      data: {
        orgId,
        projectId: input.projectId,
        name: input.name,
        color: input.color ?? '#6366f1',
        description: input.description ?? null,
      },
    });

    return toDomain(tag);
  }

  async findById(id: string, orgId: string): Promise<TaskTag | null> {
    const tag = await this.prisma.projectTag.findFirst({
      where: { id, orgId },
    });
    return tag ? toDomain(tag) : null;
  }

  async findByProject(projectId: string, orgId: string): Promise<TaskTag[]> {
    const tags = await this.prisma.projectTag.findMany({
      where: { projectId, orgId },
      orderBy: { name: 'asc' },
    });
    return tags.map(toDomain);
  }

  async findByProjectWithCounts(projectId: string, orgId: string): Promise<TaskTagWithCounts[]> {
    const tags = await this.prisma.projectTag.findMany({
      where: { projectId, orgId },
      include: {
        _count: {
          select: {
            taskAssignments: true,
            featureAssignments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return tags.map((tag) => ({
      ...toDomain(tag),
      taskCount: tag._count.taskAssignments,
      featureCount: tag._count.featureAssignments,
    }));
  }

  async update(id: string, orgId: string, input: UpdateTaskTagInput): Promise<TaskTag> {
    // Verify tag exists and belongs to org
    const existing = await this.prisma.projectTag.findFirst({
      where: { id, orgId },
    });
    if (!existing) {
      throw new NotFoundError('Tag não encontrada');
    }

    const updated = await this.prisma.projectTag.update({
      where: { id },
      data: {
        name: input.name,
        color: input.color,
        description: input.description,
      },
    });

    return toDomain(updated);
  }

  async delete(id: string, orgId: string): Promise<void> {
    const existing = await this.prisma.projectTag.findFirst({
      where: { id, orgId },
    });
    if (!existing) {
      throw new NotFoundError('Tag não encontrada');
    }

    // Cascade delete will remove all assignments
    await this.prisma.projectTag.delete({
      where: { id },
    });
  }

  // ==================== Task Assignments ====================

  async assignToTask(taskId: string, tagIds: string[], orgId: string): Promise<void> {
    // OPTIMIZED: Single transaction for validation + assignment
    await this.prisma.$transaction(async (tx) => {
      // Validate task exists and get projectId
      const task = await tx.task.findFirst({
        where: { id: taskId, orgId },
        select: { projectId: true },
      });
      if (!task) {
        throw new NotFoundError('Tarefa não encontrada');
      }

      // Validate tags in same query (if provided)
      if (tagIds.length > 0) {
        const validTagCount = await tx.taskTag.count({
          where: { id: { in: tagIds }, projectId: task.projectId, orgId },
        });
        if (validTagCount !== tagIds.length) {
          throw new ValidationError('Uma ou mais tags são inválidas ou não pertencem a este projeto');
        }
      }

      // Atomic delete + create
      await tx.taskTagAssignment.deleteMany({ where: { taskId } });
      if (tagIds.length > 0) {
        await tx.taskTagAssignment.createMany({
          data: tagIds.map((tagId) => ({ taskId, tagId })),
          skipDuplicates: true,
        });
      }
    });
  }

  async unassignFromTask(taskId: string, tagId: string, orgId: string): Promise<void> {
    // Validate task exists
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, orgId },
    });
    if (!task) {
      throw new NotFoundError('Tarefa não encontrada');
    }

    await this.prisma.projectTagAssignment.deleteMany({
      where: { taskId, tagId },
    });
  }

  async getTagsForTask(taskId: string): Promise<TagInfo[]> {
    const assignments = await this.prisma.projectTagAssignment.findMany({
      where: { taskId },
      select: {
        tag: {
          select: { id: true, name: true, color: true },
        },
      },
    });
    return assignments.map((a) => a.tag);
  }

  // ==================== Feature Assignments ====================

  async assignToFeature(featureId: string, tagIds: string[], orgId: string): Promise<void> {
    // OPTIMIZED: Single transaction for validation + assignment
    await this.prisma.$transaction(async (tx) => {
      // Validate feature exists and get projectId
      const feature = await tx.feature.findFirst({
        where: { id: featureId, orgId },
        select: { epic: { select: { projectId: true } } },
      });
      if (!feature) {
        throw new NotFoundError('Feature não encontrada');
      }

      const projectId = feature.epic.projectId;

      // Validate tags in same transaction (if provided)
      if (tagIds.length > 0) {
        const validTagCount = await tx.taskTag.count({
          where: { id: { in: tagIds }, projectId, orgId },
        });
        if (validTagCount !== tagIds.length) {
          throw new ValidationError('Uma ou mais tags são inválidas ou não pertencem a este projeto');
        }
      }

      // Atomic delete + create
      await tx.featureTagAssignment.deleteMany({ where: { featureId } });
      if (tagIds.length > 0) {
        await tx.featureTagAssignment.createMany({
          data: tagIds.map((tagId) => ({ featureId, tagId })),
          skipDuplicates: true,
        });
      }
    });
  }

  async unassignFromFeature(featureId: string, tagId: string, orgId: string): Promise<void> {
    const feature = await this.prisma.feature.findFirst({
      where: { id: featureId, orgId },
    });
    if (!feature) {
      throw new NotFoundError('Feature não encontrada');
    }

    await this.prisma.featureTagAssignment.deleteMany({
      where: { featureId, tagId },
    });
  }

  async getTagsForFeature(featureId: string): Promise<TagInfo[]> {
    const assignments = await this.prisma.featureTagAssignment.findMany({
      where: { featureId },
      select: {
        tag: {
          select: { id: true, name: true, color: true },
        },
      },
    });
    return assignments.map((a) => a.tag);
  }
}
