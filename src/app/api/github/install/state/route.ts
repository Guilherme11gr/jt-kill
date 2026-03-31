import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { createHmac } from 'crypto';

const STATE_SECRET = process.env.GITHUB_APP_STATE_SECRET || process.env.NEXTAUTH_SECRET || 'default-state-secret';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const body = await request.json();
    const { projectId, orgId } = body as { projectId?: string; orgId?: string };

    if (!projectId || !orgId) {
      return NextResponse.json({ error: 'Missing projectId or orgId' }, { status: 400 });
    }

    if (orgId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const timestamp = Date.now();
    const payload = `${projectId}:${orgId}:${timestamp}`;
    const signature = createHmac('sha256', STATE_SECRET).update(payload).digest('hex');

    const state = Buffer.from(
      JSON.stringify({ projectId, orgId, timestamp, signature })
    ).toString('base64url');

    return NextResponse.json({ state });
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
}
