/**
 * UserProfile Repository - Prisma Adapter
 */
import type { PrismaClient, UserProfile as PrismaUserProfile, UserRole } from '@prisma/client';

export interface UserProfile {
  id: string;
  orgId: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
}

export class UserProfileRepository {
  constructor(private prisma: PrismaClient) { }

  /**
   * Find user profile by ID
   */
  async findById(id: string, orgId: string): Promise<UserProfile | null> {
    return this.prisma.userProfile.findFirst({
      where: { id, orgId },
    });
  }

  /**
   * Find all users in organization
   */
  async findByOrgId(orgId: string): Promise<UserProfile[]> {
    return this.prisma.userProfile.findMany({
      where: { orgId },
      orderBy: { displayName: 'asc' },
    });
  }

  /**
   * Update user profile
   */
  async update(id: string, orgId: string, data: UpdateProfileInput): Promise<UserProfile> {
    return this.prisma.userProfile.update({
      where: { id },
      data,
    });
  }

  /**
   * Get count of users in org
   */
  async countByOrgId(orgId: string): Promise<number> {
    return this.prisma.userProfile.count({
      where: { orgId },
    });
  }
}
