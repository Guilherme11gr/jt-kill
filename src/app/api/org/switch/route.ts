import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { prisma } from '@/infra/adapters/prisma';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Cookie configuration
const CURRENT_ORG_COOKIE = 'jt-current-org';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// UUID regex - mais permissivo para suportar UUIDs de teste
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const switchOrgSchema = z.object({
  orgId: z.string().regex(UUID_REGEX, 'ID da organização inválido'),
});

/**
 * POST /api/org/switch
 * 
 * Switch current organization context.
 * Sets httpOnly cookie for security.
 * 
 * Body: { orgId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return jsonError('UNAUTHORIZED', 'Sessão inválida', 401);
    }

    // 2. Validate input
    const body = await request.json();
    const parsed = switchOrgSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { orgId } = parsed.data;

    // 3. Verify user is member of target org
    const membership = await prisma.$queryRaw<Array<{ orgId: string }>>`
      SELECT org_id as "orgId"
      FROM public.org_memberships
      WHERE user_id = ${user.id}::uuid 
        AND org_id = ${orgId}::uuid
      LIMIT 1
    `;

    if (!membership || membership.length === 0) {
      return jsonError('FORBIDDEN', 'Você não é membro desta organização', 403);
    }

    // 4. Set httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set(CURRENT_ORG_COOKIE, orgId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return jsonSuccess({
      message: 'Organização alterada com sucesso',
      orgId,
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
