/**
 * OrgMembership Repository - Prisma Adapter
 * Handles user memberships across multiple organizations
 */
import type { PrismaClient, OrgMembership as PrismaOrgMembership, UserRole } from '@prisma/client';

export interface OrgMembership {
  id: string;
  userId: string;
  orgId: string;
  role: UserRole;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgMembershipWithOrg extends OrgMembership {
  organization: {
    name: string;
    slug: string;
  };
}

export class OrgMembershipRepository {
  constructor(private prisma: PrismaClient) { }

  /**
   * Find all memberships for a user (with org details)
   */
  async findByUserId(userId: string): Promise<OrgMembershipWithOrg[]> {
    return this.prisma.orgMembership.findMany({
      where: { userId },
      include: {
        organization: {
          select: { name: true, slug: true },
        },
      },
      orderBy: [
        { isDefault: 'desc' }, // Default org first
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Find a specific membership
   */
  async findByUserAndOrg(userId: string, orgId: string): Promise<OrgMembership | null> {
    return this.prisma.orgMembership.findUnique({
      where: {
        userId_orgId: { userId, orgId },
      },
    });
  }

  /**
   * Get user's role in a specific org
   */
  async getRoleInOrg(userId: string, orgId: string): Promise<UserRole | null> {
    const membership = await this.findByUserAndOrg(userId, orgId);
    return membership?.role ?? null;
  }

  /**
   * Get user's default org
   */
  async getDefaultOrg(userId: string): Promise<OrgMembershipWithOrg | null> {
    const membership = await this.prisma.orgMembership.findFirst({
      where: { userId, isDefault: true },
      include: {
        organization: {
          select: { name: true, slug: true },
        },
      },
    });
    return membership;
  }

  /**
   * Create a new membership
   */
  async create(data: {
    userId: string;
    orgId: string;
    role: UserRole;
    isDefault?: boolean;
  }): Promise<OrgMembership> {
    return this.prisma.orgMembership.create({
      data: {
        userId: data.userId,
        orgId: data.orgId,
        role: data.role,
        isDefault: data.isDefault ?? false,
      },
    });
  }

  /**
   * Set a membership as the default for a user
   * (Unsets any previous default)
   */
  async setDefault(userId: string, orgId: string): Promise<void> {
    await this.prisma.$transaction([
      // Unset all defaults for this user
      this.prisma.orgMembership.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      // Set the new default
      this.prisma.orgMembership.update({
        where: { userId_orgId: { userId, orgId } },
        data: { isDefault: true },
      }),
    ]);
  }

  /**
   * Check if user is a member of an org
   */
  async isMember(userId: string, orgId: string): Promise<boolean> {
    const count = await this.prisma.orgMembership.count({
      where: { userId, orgId },
    });
    return count > 0;
  }

  /**
   * Count how many orgs a user belongs to
   */
  async countByUserId(userId: string): Promise<number> {
    return this.prisma.orgMembership.count({
      where: { userId },
    });
  }

  /**
   * Get all members of an org
   */
  async findByOrgId(orgId: string): Promise<OrgMembership[]> {
    return this.prisma.orgMembership.findMany({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
