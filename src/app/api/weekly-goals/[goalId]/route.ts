import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError, NotFoundError } from '@/shared/errors';
import { prisma } from '@/infra/adapters/prisma';

export const dynamic = 'force-dynamic';

async function getGoalWithAuth(goalId: string, userId: string) {
  const goal = await prisma.weeklyGoal.findUnique({
    where: { id: goalId },
  });

  if (!goal) {
    throw new NotFoundError('Meta da semana');
  }

  if (goal.userId !== userId) {
    throw new NotFoundError('Meta da semana');
  }

  return goal;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await params;
    const supabase = await createClient();
    const { userId } = await extractAuthenticatedTenant(supabase);

    await getGoalWithAuth(goalId, userId);

    await prisma.weeklyGoal.delete({
      where: { id: goalId },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
