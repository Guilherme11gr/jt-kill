import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { featureRepository } from '@/infra/adapters/prisma';
import { getAllFeatures } from '@/domain/use-cases/features/get-all-features';

// Disable Next.js cache - data depends on org cookie
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const features = await getAllFeatures(tenantId, { featureRepository });
    return jsonSuccess(features);

  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
