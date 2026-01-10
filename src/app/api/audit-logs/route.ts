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
  action: z.string().nullable().optional().transform(val => val && val.trim() !== '' ? val : undefined),
  userId: z.string().uuid().nullable().optional().transform(val => val || undefined),
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
    
    // Parse and validate query parameters
    const query = querySchema.safeParse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      action: searchParams.get('action'),
      userId: searchParams.get('userId'),
    });

    if (!query.success) {
      return jsonError('VALIDATION_ERROR', 'Parâmetros inválidos', 400, {
        errors: query.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const { logs, total } = await auditLogRepository.findByOrgId(tenantId, {
      limit: query.data.limit,
      offset: query.data.offset,
      action: query.data.action,
      userId: query.data.userId,
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
        limit: query.data.limit,
        offset: query.data.offset,
        hasMore: query.data.offset + query.data.limit < total,
      },
    });

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
