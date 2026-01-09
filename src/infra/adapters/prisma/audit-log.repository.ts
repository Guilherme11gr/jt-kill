/**
 * AuditLog Repository - Prisma Adapter
 */
import type { PrismaClient, AuditLog as PrismaAuditLog, Prisma } from '@prisma/client';

export interface AuditLog {
  id: string;
  orgId: string;
  userId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
}

export interface CreateAuditLogInput {
  orgId: string;
  userId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

// Audit action constants for type safety
export const AUDIT_ACTIONS = {
  // User actions
  USER_JOINED: 'user.joined',
  USER_LEFT: 'user.left',
  USER_REMOVED: 'user.removed',
  USER_ROLE_CHANGED: 'user.role.changed',

  // Invite actions
  INVITE_CREATED: 'invite.created',
  INVITE_REVOKED: 'invite.revoked',
  INVITE_ACCEPTED: 'invite.accepted',

  // Project actions
  PROJECT_CREATED: 'project.created',
  PROJECT_DELETED: 'project.deleted',

  // Task actions
  TASK_CREATED: 'task.created',
  TASK_STATUS_CHANGED: 'task.status.changed',
  TASK_ASSIGNED: 'task.assigned',
  TASK_DELETED: 'task.deleted',

  // Organization actions
  ORG_UPDATED: 'org.updated',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

export class AuditLogRepository {
  constructor(private prisma: PrismaClient) { }

  /**
   * Create a new audit log entry
   */
  async log(data: CreateAuditLogInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        orgId: data.orgId,
        userId: data.userId,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        metadata: data.metadata as Prisma.JsonObject,
      },
    });
  }

  /**
   * Find audit logs for an organization with pagination
   */
  async findByOrgId(
    orgId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: string;
      userId?: string;
    }
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      orgId,
      ...(options?.action && { action: options.action }),
      ...(options?.userId && { userId: options.userId }),
    };

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Find audit logs for a specific target
   */
  async findByTarget(
    orgId: string,
    targetType: string,
    targetId: string
  ): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { orgId, targetType, targetId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
