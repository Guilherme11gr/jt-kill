import type { PrismaClient } from '@prisma/client';

export interface AgentApiKeyRecord {
  id: string;
  orgId: string;
  keyHash: string;
  keyPrefix: string;
  createdBy: string;
  createdAt: Date;
  rotatedAt: Date | null;
  lastUsedAt: Date | null;
  lastUsedAgentName: string | null;
}

export interface UpsertAgentApiKeyInput {
  orgId: string;
  keyHash: string;
  keyPrefix: string;
  createdBy: string;
}

function mapRecord(record: {
  id: string;
  orgId: string;
  keyHash: string;
  keyPrefix: string;
  createdBy: string;
  createdAt: Date;
  rotatedAt: Date | null;
  lastUsedAt: Date | null;
  lastUsedAgentName: string | null;
}): AgentApiKeyRecord {
  return {
    id: record.id,
    orgId: record.orgId,
    keyHash: record.keyHash,
    keyPrefix: record.keyPrefix,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    rotatedAt: record.rotatedAt,
    lastUsedAt: record.lastUsedAt,
    lastUsedAgentName: record.lastUsedAgentName,
  };
}

export class AgentApiKeyRepository {
  constructor(private prisma: PrismaClient) {}

  async findByOrgId(orgId: string): Promise<AgentApiKeyRecord | null> {
    const client = this.prisma as PrismaClient & { agentApiKey: any };
    const record = await client.agentApiKey.findUnique({
      where: { orgId },
    });

    return record ? mapRecord(record) : null;
  }

  async findByKeyHash(keyHash: string): Promise<AgentApiKeyRecord | null> {
    const client = this.prisma as PrismaClient & { agentApiKey: any };
    const record = await client.agentApiKey.findUnique({
      where: { keyHash },
    });

    return record ? mapRecord(record) : null;
  }

  async upsertForOrg(input: UpsertAgentApiKeyInput): Promise<{
    record: AgentApiKeyRecord;
    rotated: boolean;
  }> {
    const client = this.prisma as PrismaClient & { agentApiKey: any };
    const existing = await client.agentApiKey.findUnique({
      where: { orgId: input.orgId },
      select: { id: true },
    });

    const now = new Date();
    const record = await client.agentApiKey.upsert({
      where: { orgId: input.orgId },
      create: {
        orgId: input.orgId,
        keyHash: input.keyHash,
        keyPrefix: input.keyPrefix,
        createdBy: input.createdBy,
      },
      update: {
        keyHash: input.keyHash,
        keyPrefix: input.keyPrefix,
        createdBy: input.createdBy,
        rotatedAt: now,
        lastUsedAt: null,
        lastUsedAgentName: null,
      },
    });

    return {
      record: mapRecord(record),
      rotated: Boolean(existing),
    };
  }

  async touchUsage(id: string, agentName: string): Promise<void> {
    const client = this.prisma as PrismaClient & { agentApiKey: any };
    await client.agentApiKey.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
        lastUsedAgentName: agentName,
      },
    });
  }
}
