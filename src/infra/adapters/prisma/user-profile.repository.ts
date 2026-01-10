/**
 * UserProfile Repository - Prisma Adapter
 * 
 * UserProfile is a global entity (1:1 with auth.users).
 * Org relationships and roles are managed through OrgMembership.
 */
import type { PrismaClient, UserProfile as PrismaUserProfile, UserRole } from '@prisma/client';

export interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  // DEPRECATED fields - kept for backward compatibility
  orgId?: string | null;
  role?: UserRole;
}

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
}

export interface CreateProfileInput {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

// Legacy interface - kept for backward compatibility
export interface LegacyCreateProfileInput {
  id: string;
  orgId: string;
  displayName: string;
  avatarUrl?: string | null;
  role: UserRole;
}

export class UserProfileRepository {
  constructor(private prisma: PrismaClient) { }

  /**
   * Find user profile by ID (global - UserProfile is 1:1 with auth.users)
   */
  async findByIdGlobal(id: string): Promise<UserProfile | null> {
    return this.prisma.userProfile.findUnique({
      where: { id },
    });
  }

  /**
   * Create a new user profile (global)
   */
  async create(data: CreateProfileInput): Promise<UserProfile> {
    return this.prisma.userProfile.create({
      data: {
        id: data.id,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        // Set deprecated fields to null/default for new profiles
        orgId: null,
        role: 'MEMBER',
      },
    });
  }

  /**
   * Update user profile (global - ignores orgId)
   */
  async updateGlobal(id: string, data: UpdateProfileInput): Promise<UserProfile> {
    return this.prisma.userProfile.update({
      where: { id },
      data,
    });
  }

  /**
   * @deprecated Use findByIdGlobal - UserProfile is now global
   */
  async findById(id: string, orgId: string): Promise<UserProfile | null> {
    return this.findByIdGlobal(id);
  }

  /**
   * @deprecated Use create - UserProfile is now global without org/role
   */
  async upsert(data: LegacyCreateProfileInput): Promise<UserProfile> {
    return this.prisma.userProfile.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        orgId: data.orgId,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        role: data.role,
      },
      update: {
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        // Don't update orgId/role - these are deprecated
      },
    });
  }

  /**
   * @deprecated Use updateGlobal - orgId is no longer needed
   */
  async update(id: string, orgId: string, data: UpdateProfileInput): Promise<UserProfile> {
    return this.updateGlobal(id, data);
  }

  /**
   * Get count of users in org (via OrgMembership)
   * @deprecated Should use OrgMembership directly
   */
  async countByOrgId(orgId: string): Promise<number> {
    return this.prisma.orgMembership.count({
      where: { orgId },
    });
  }
}
