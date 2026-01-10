import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { prisma } from '@/infra/adapters/prisma';

// Disable Next.js cache - data depends on org cookie
export const dynamic = 'force-dynamic';

/**
 * GET /api/users - List all members of the current organization
 * Uses OrgMembership table for accurate multi-org member listing.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // Query memberships for this org, including user profile data
    const memberships = await prisma.orgMembership.findMany({
      where: { orgId: tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // OWNER first, then ADMIN, then MEMBER
        { createdAt: 'asc' }
      ]
    });

    // Get user profiles for display names/avatars
    const userIds = memberships.map(m => m.userId);
    const profiles = await prisma.userProfile.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, avatarUrl: true }
    });
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // Map to a simpler format for the frontend
    const mappedUsers = memberships.map(m => {
      const profile = profileMap.get(m.userId);
      return {
        id: m.userId,
        displayName: profile?.displayName ?? m.user?.email?.split('@')[0] ?? 'Usuário',
        avatarUrl: profile?.avatarUrl ?? null,
        role: m.role,
      };
    });

    return jsonSuccess(mappedUsers);

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

