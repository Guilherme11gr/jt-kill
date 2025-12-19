import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    status: 'ok' as 'ok' | 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      supabase: false,
      database: false,
    },
  };

  try {
    // Check Supabase connection
    const supabase = await createClient();
    const { error: authError } = await supabase.auth.getSession();
    checks.services.supabase = !authError;

    // Check database connection
    const { error: dbError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    checks.services.database = !dbError;

  } catch (error) {
    console.error('Health check failed:', error);
    checks.status = 'degraded' as const;
  }

  const allHealthy = Object.values(checks.services).every(Boolean);

  return NextResponse.json(checks, {
    status: allHealthy ? 200 : 503,
  });
}
