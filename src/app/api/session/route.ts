import { NextResponse } from 'next/server';
import { getServerSessionStatus } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await getServerSessionStatus();

  return NextResponse.json(
    { data: status },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
