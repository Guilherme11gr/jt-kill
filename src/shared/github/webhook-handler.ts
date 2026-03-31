import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

export function verifyWebhookSignature(payload: string, signatureHeader: string): boolean {
  const expectedSignature = `sha256=${createHmac('sha256', GITHUB_WEBHOOK_SECRET).update(payload).digest('hex')}`;

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const actualBuffer = Buffer.from(signatureHeader, 'utf8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

const RepositorySchema = z.object({
  id: z.number(),
  full_name: z.string(),
  html_url: z.string(),
  name: z.string(),
  owner: z.object({ login: z.string() }),
});

const InstallationSchema = z.object({
  id: z.number(),
  account: z.object({ login: z.string() }).optional(),
});

const PullRequestSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  html_url: z.string(),
  state: z.enum(['open', 'closed']),
  merged: z.boolean(),
  merged_at: z.string().nullable(),
  merged_by: z.object({ login: z.string() }).nullable().optional(),
});

const CommitSchema = z.object({
  id: z.string(),
  message: z.string(),
  url: z.string().optional(),
  author: z.object({ name: z.string().optional() }).optional(),
});

const WebhookEventSchema = z.object({
  action: z.string().optional(),
  installation: InstallationSchema.optional(),
  repository: RepositorySchema.optional(),
  sender: z.object({ login: z.string() }).optional(),
  ref: z.string().optional(),
  commits: z.array(CommitSchema).optional(),
  pull_request: PullRequestSchema.optional(),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

export function parseWebhookEvent(payload: unknown): WebhookEvent {
  return WebhookEventSchema.parse(payload);
}

export function truncatePushPayload(event: WebhookEvent): unknown {
  if (!event.commits) return structuredClone(event);
  const truncatedCommits = event.commits.map((c) => ({
    id: c.id,
    message: c.message,
  }));
  return {
    ...structuredClone(event),
    commits: truncatedCommits,
  };
}
