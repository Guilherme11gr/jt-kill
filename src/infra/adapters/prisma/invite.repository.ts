/**
 * Invite Repository - Prisma Adapter
 */
import type { PrismaClient, Invite as PrismaInvite, UserRole, InviteStatus } from '@prisma/client';

export interface Invite {
  id: string;
  orgId: string;
  token: string;
  email: string | null;
  role: UserRole;
  status: InviteStatus;
  createdBy: string;
  expiresAt: Date;
  acceptedBy: string | null;
  acceptedAt: Date | null;
  createdAt: Date;
}

export interface CreateInviteInput {
  orgId: string;
  email?: string;
  role: UserRole;
  createdBy: string;
  expiresAt: Date;
}

export class InviteRepository {
  constructor(private prisma: PrismaClient) { }

  /**
   * Create a new invite
   */
  async create(data: CreateInviteInput): Promise<Invite> {
    return this.prisma.invite.create({
      data: {
        orgId: data.orgId,
        email: data.email,
        role: data.role,
        createdBy: data.createdBy,
        expiresAt: data.expiresAt,
        status: 'PENDING',
      },
    });
  }

  /**
   * Find invite by token
   */
  async findByToken(token: string): Promise<Invite | null> {
    return this.prisma.invite.findUnique({
      where: { token },
    });
  }

  /**
   * Find invite by ID
   */
  async findById(id: string, orgId: string): Promise<Invite | null> {
    return this.prisma.invite.findFirst({
      where: { id, orgId },
    });
  }

  /**
   * List all pending invites for an organization
   */
  async findPendingByOrgId(orgId: string): Promise<Invite[]> {
    return this.prisma.invite.findMany({
      where: {
        orgId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Accept an invite
   */
  async accept(token: string, userId: string): Promise<Invite> {
    return this.prisma.invite.update({
      where: { token },
      data: {
        status: 'ACCEPTED',
        acceptedBy: userId,
        acceptedAt: new Date(),
      },
    });
  }

  /**
   * Revoke an invite
   */
  async revoke(id: string, orgId: string): Promise<Invite> {
    return this.prisma.invite.update({
      where: { id },
      data: { status: 'REVOKED' },
    });
  }

  /**
   * Check if invite is valid (pending and not expired)
   */
  async isValid(token: string): Promise<boolean> {
    const invite = await this.findByToken(token);
    if (!invite) return false;
    if (invite.status !== 'PENDING') return false;
    if (invite.expiresAt < new Date()) return false;
    return true;
  }

  /**
   * Get organization details for an invite (for public page)
   */
  async getInviteDetails(token: string): Promise<{ invite: Invite; orgName: string } | null> {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
      include: {
        organization: {
          select: { name: true },
        },
      },
    });

    if (!invite) return null;

    return {
      invite,
      orgName: invite.organization.name,
    };
  }
}
