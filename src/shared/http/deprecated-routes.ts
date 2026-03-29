import { NextResponse } from 'next/server';

export function deprecatedRoute(scope: string) {
  return NextResponse.json(
    {
      error: {
        code: 'REMOVED',
        message: `${scope} foi removido da aplicação.`,
      },
    },
    { status: 410 }
  );
}
