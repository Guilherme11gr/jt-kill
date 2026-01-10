import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, requireRole } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { auditLogRepository } from '@/infra/adapters/prisma';
import { z } from 'zod';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  action: z.string().optional().transform(val => val && val.trim() !== '' ? val : undefined),
  userId: z.string().uuid().optional(),
});

/**
 * GET /api/audit-logs - Get audit logs for the organization
 * Requires: OWNER role only
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(supabase);

    // Only OWNER can view audit logs
    await requireRole(supabase, userId, ['OWNER']);

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      action: searchParams.get('action'),
      userId: searchParams.get('userId'),
    });

    const { logs, total } = await auditLogRepository.findByOrgId(tenantId, {
      limit: query.limit,
      offset: query.offset,
      action: query.action,
      userId: query.userId,
    });

    return jsonSuccess({
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        userId: log.userId,
        targetType: log.targetType,
        targetId: log.targetId,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total,
      },
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
