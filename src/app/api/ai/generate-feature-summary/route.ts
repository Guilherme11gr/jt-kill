import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { aiAdapter } from '@/infra/adapters/ai';
import { featureRepository, projectDocRepository, docTagRepository } from '@/infra/adapters/prisma';
import { generateFeatureSummary } from '@/domain/use-cases/ai/generate-feature-summary';

// Schemas
const bodySchema = z.object({
  featureId: z.string().uuid(),
  forceRegenerate: z.boolean().optional(),
});

export const GET = async (req: NextRequest) => {
  try {
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const { searchParams } = new URL(req.url);
    const featureId = searchParams.get('featureId');

    if (!featureId) {
      return NextResponse.json({ message: 'Missing featureId' }, { status: 400 });
    }

    const feature = await featureRepository.findByIdWithTasksAndComments(featureId, tenantId);
    if (!feature) {
      return NextResponse.json({ message: 'Feature not found' }, { status: 404 });
    }

    const docTitle = `Resumo IA: ${feature.title}`;
    const tagName = 'ia-summary';

    // 1. Find the tag first
    const tag = await docTagRepository.findByName(tagName, feature.epic.projectId, tenantId);

    if (tag) {
      // 2. Get all docs with this tag (usually few)
      const docIds = await docTagRepository.findDocIdsByTagId(tag.id, tenantId);

      if (docIds.length > 0) {
        // 3. Fetch only these docs to find title match
        // We use findByIds which returns { title, content }
        // Note: findByIds signature in repo might limit chars, but we want full content?
        // Existing findByIds defaults to 4000 chars context. We probably want full.
        // But we don't have a "findFullByIds". 
        // Given "Summary" is likely small enough, 4000 chars might suffice, 
        // BUT if it's truncated, it's bad.
        // BETTER: iterating them and checking title is safer than fetching all project docs.

        // Actually, we can loop and findFirst? No, too many queries.
        // Let's use the efficient findByProjectId approach but filtered in memory IF list is small?
        // No, the initial approach was fetching ALL project docs.
        // Optimizing:

        // A better query would be to db join. We can't change repo easily now.
        // Let's stick to: findByIds (limited) and see.
        // Wait, existing findByIds returns truncated content potentially.
        // Using `findByProjectId` was actually fetching metadata only (no content).
        // That was safer for large docs.

        // Let's refine the previous approach:
        // 1. Get ALL Project Docs (Metadata only) -> Filter by Title.
        // 2. Check if THAT doc has the tag assignment?
        // That's more robust than relying on "findByIds" content.

        const projectDocs = await projectDocRepository.findByProjectId(feature.epic.projectId, tenantId);
        const match = projectDocs.find(d =>
          d.title === docTitle &&
          d.tags?.some(t => t.tag.name === 'ia-summary')
        );

        if (match) {
          const fullDoc = await projectDocRepository.findById(match.id, tenantId);
          return NextResponse.json({
            summary: fullDoc?.content || null,
            lastAnalyzedAt: fullDoc?.updatedAt || null
          });
        }
      }
    }

    return NextResponse.json({ summary: null, lastAnalyzedAt: null });

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
 */
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
    // Ensure user is authenticated and get their Org/Tenant ID
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    const body = await req.json();
    const { featureId, forceRegenerate } = bodySchema.parse(body);

    // Fetch feature details for Project ID and Title (needed for persistence)
    const feature = await featureRepository.findByIdWithTasksAndComments(featureId, tenantId);
    if (!feature) {
      return NextResponse.json({ message: 'Feature not found' }, { status: 404 });
    }

    // Call Use Case which returns a Generator
    const streamGenerator = await generateFeatureSummary(
      { featureId, orgId: tenantId, forceRegenerate },
      { aiAdapter, featureRepository }
    );

    // Define save handler
    // Define save handler
    const handleSaveParams = async (content: string) => {
      try {
        const tagName = 'ia-summary';
        const docTitle = `Resumo IA: ${feature.title}`;

        // 1. Safe Tag Creation (Upsert-like logic via find first, if not create catch race)
        // Prisma doesn't support upsert directly without unique where, which we have (projectId_name)
        // defined in schema as @@unique([projectId, name])

        let tag = await docTagRepository.findByName(tagName, feature.epic.projectId, tenantId);
        if (!tag) {
          try {
            tag = await docTagRepository.create({
              orgId: tenantId,
              projectId: feature.epic.projectId,
              name: tagName
            });
          } catch (e) {
            // If race condition met (unique constraint), fetch again
            tag = await docTagRepository.findByName(tagName, feature.epic.projectId, tenantId);
          }
        }

        if (!tag) throw new Error('Failed to get or create tag');

        // 2. Create Document
        const newDoc = await projectDocRepository.create({
          orgId: tenantId,
          projectId: feature.epic.projectId,
          title: docTitle,
          content: content
        });

        // 3. Assign Tag
        await docTagRepository.assignToDoc(newDoc.id, tag.id);

        console.log(`[AI] Summary saved as doc: ${newDoc.id}`);
      } catch (err) {
        console.error('[AI] Failed to save summary doc:', err);
      }
    };

    // Convert to ReadableStream for Next.js Response
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
