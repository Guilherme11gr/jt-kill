import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

export class GitHubEventRepository {
  constructor(private prisma: PrismaClient) {}

  async isProcessed(eventId: string): Promise<boolean> {
    const existing = await this.prisma.gitHubEvent.findUnique({
      where: { eventId },
      select: { id: true, processedAt: true },
    });
    return existing !== null && existing.processedAt !== null;
  }

  async markProcessed(eventId: string, eventType: string, payload: unknown): Promise<void> {
    const jsonPayload = structuredClone(payload) as Prisma.InputJsonValue;
    await this.prisma.gitHubEvent.upsert({
      where: { eventId },
      create: {
        eventId,
        eventType,
        payload: jsonPayload,
        processedAt: new Date(),
      },
      update: {
        processedAt: new Date(),
      },
    });
  }

  async recordEvent(eventId: string, eventType: string, payload: unknown): Promise<void> {
    const jsonPayload = structuredClone(payload) as Prisma.InputJsonValue;
    await this.prisma.gitHubEvent.upsert({
      where: { eventId },
      create: {
        eventId,
        eventType,
        payload: jsonPayload,
      },
      update: {},
    });
  }
}
