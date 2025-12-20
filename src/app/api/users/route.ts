import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { userProfileRepository } from '@/infra/adapters/prisma';

/**
 * GET /api/users - List all users in the organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const users = await userProfileRepository.findByOrgId(tenantId);

    // Map to a simpler format for the frontend
    const mappedUsers = users.map(u => ({
      id: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      role: u.role,
    }));

    return jsonSuccess(mappedUsers);

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
