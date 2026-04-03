import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError, ConflictError } from '@/shared/errors';
import { prisma } from '@/infra/adapters/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const WEEKLY_GOALS_SOFT_LIMIT = 7;

const createGoalSchema = z.object({
  featureId: z.string().uuid('Feature ID inválido'),
});

function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function calculateFeatureProgress(featureId: string): Promise<{ done: number; total: number }> {
  const tasks = await prisma.task.groupBy({
    by: ['status'],
    where: { featureId },
    _count: { status: true },
  });

  const total = tasks.reduce((sum, t) => sum + t._count.status, 0);
  const done = tasks.find(t => t.status === 'DONE')?._count.status ?? 0;

  return { done, total };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { tenantId, userId } = await extractAuthenticatedTenant(supabase);

    const weekStart = getWeekStart();

    const goals = await prisma.weeklyGoal.findMany({
      where: {
        userId,
        weekStart,
        feature: {
          orgId: tenantId,
        },
      },
      include: {
        feature: {
          select: {
            id: true,
            title: true,
            status: true,
            health: true,
            healthReason: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const progress = await calculateFeatureProgress(goal.featureId);
        return {
          id: goal.id,
          featureId: goal.featureId,
          weekStart: goal.weekStart,
          createdAt: goal.createdAt,
          updatedAt: goal.updatedAt,
          feature: goal.feature,
          progress,
        };
      })
    );

    const response: { goals: typeof goalsWithProgress; weekStart: Date; count: number; limitWarning: boolean } = {
      goals: goalsWithProgress,
      weekStart,
      count: goalsWithProgress.length,
      limitWarning: goalsWithProgress.length >= WEEKLY_GOALS_SOFT_LIMIT,
    };

    return jsonSuccess(response);
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenantId, userId } = await extractAuthenticatedTenant(supabase);

    const body = await request.json();
    const parsed = createGoalSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, {
        errors: parsed.error.flatten().fieldErrors,
      } as Record<string, unknown>);
    }

    const { featureId } = parsed.data;

    const feature = await prisma.feature.findUnique({
      where: { id: featureId },
      select: { orgId: true },
    });

    if (!feature) {
      return jsonError('NOT_FOUND', 'Feature não encontrada', 404);
    }

    if (feature.orgId !== tenantId) {
      return jsonError('FORBIDDEN', 'Feature não pertence à sua organização', 403);
    }

    const weekStart = getWeekStart();

    const existingGoal = await prisma.weeklyGoal.findUnique({
      where: {
        userId_featureId_weekStart: {
          userId,
          featureId,
          weekStart,
        },
      },
    });

    if (existingGoal) {
      throw new ConflictError('Esta feature já é uma meta desta semana');
    }

    const currentCount = await prisma.weeklyGoal.count({
      where: { userId, weekStart },
    });

    const goal = await prisma.weeklyGoal.create({
      data: {
        userId,
        featureId,
        weekStart,
      },
      include: {
        feature: {
          select: {
            id: true,
            title: true,
            status: true,
            health: true,
            healthReason: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const progress = await calculateFeatureProgress(goal.featureId);

    const response: {
      id: string;
      featureId: string;
      weekStart: Date;
      createdAt: Date;
      updatedAt: Date;
      feature: typeof goal.feature;
      progress: { done: number; total: number };
      limitWarning: boolean;
    } = {
      id: goal.id,
      featureId: goal.featureId,
      weekStart: goal.weekStart,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
      feature: goal.feature,
      progress,
      limitWarning: currentCount + 1 >= WEEKLY_GOALS_SOFT_LIMIT,
    };

    return jsonSuccess(response, { status: 201 });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
