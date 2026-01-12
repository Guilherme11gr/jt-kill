import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { aiAdapter } from '@/infra/adapters/ai';
import { featureRepository, projectDocRepository, docTagRepository } from '@/infra/adapters/prisma';
import { generateFeatureSummary } from '@/domain/use-cases/ai/generate-feature-summary';

import { Feature } from '@/shared/types';

// Schemas
const bodySchema = z.object({
  featureId: z.string().uuid(),
});

// ... (imports remain)

export const GET = async (req: NextRequest) => {
  try {
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const { searchParams } = new URL(req.url);
    const featureId = searchParams.get('featureId');

    if (!featureId) {
      return NextResponse.json({ message: 'Missing featureId' }, { status: 400 });
    }

    // Optimized: Fetch directly from Feature model
    const feature: Feature | null = await featureRepository.findById(featureId, tenantId);

    if (!feature) {
      return NextResponse.json({ message: 'Feature not found' }, { status: 404 });
    }

    return NextResponse.json({
      summary: feature.technicalAnalysis || null,
      lastAnalyzedAt: feature.analysisUpdatedAt || null
    });

  } catch (error: any) {
    console.error('Error fetching summary:', error);
    return NextResponse.json(
      { message: 'Falha ao buscar resumo' },
      { status: 500 }
    );
  }
};

/**
 * Converts an AsyncGenerator<string> into a ReadableStream
 * Side-effect: Accumulates full content and saves to DB when done.
 */
function iteratorToStream(
  iterator: AsyncGenerator<string>,
  onComplete?: (fullContent: string) => Promise<void>
) {
  let fullContent = '';
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of iterator) {
          fullContent += chunk;
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
        if (onComplete) {
          await onComplete(fullContent);
        }
      } catch (e) {
        console.error('Stream error:', e);
        controller.error(e);
      }
    },
  });
}

export const POST = async (req: NextRequest) => {
  try {
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const body = await req.json();
    const { featureId } = bodySchema.parse(body);

    const feature = await featureRepository.findById(featureId, tenantId);
    if (!feature) {
      return NextResponse.json({ message: 'Feature not found' }, { status: 404 });
    }

    const streamGenerator = await generateFeatureSummary(
      { featureId, orgId: tenantId },
      { aiAdapter, featureRepository }
    );

    const handleSaveParams = async (content: string) => {
      try {
        // Updated: Persist directly to Feature
        await featureRepository.update(featureId, tenantId, {
          technicalAnalysis: content,
          analysisUpdatedAt: new Date()
        });
        console.log(`[AI] Summary saved to feature: ${featureId}`);
      } catch (err) {
        console.error('[AI] Failed to save summary to feature:', err);
      }
    };

    const stream = iteratorToStream(streamGenerator, handleSaveParams);

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('Error generating feature summary:', error);
    return NextResponse.json(
      { message: error.message || 'Falha ao gerar resumo' },
      { status: error.status || 500 }
    );
  }
};
