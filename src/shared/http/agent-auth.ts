/**
 * Agent API Authentication Helpers
 * 
 * Tenant-scoped API key authentication for external agents/automations.
 * 
 * Auth header format: Authorization: Bearer agk_xxxxxxxxxxxx
 */

import { headers } from 'next/headers';
import { agentApiKeyRepository } from '@/infra/adapters/prisma';
import {
  AGENT_NAME_HEADER,
  hashAgentApiKey,
  parseAgentAuthorizationHeader,
  resolveAgentName,
  verifyAgentApiKey,
} from './agent-api-key';

export interface AgentAuthContext {
  keyId: string;
  orgId: string;
  userId: string; // User ID for audit trail (e.g., AI agent user)
  agentName: string; // Agent name for audit metadata (e.g., 'Claude Desktop')
  keyPrefix: string; // Last 4 chars for logging
  authMethod: 'tenant_api_key';
}

export class AgentAuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'AgentAuthError';
  }
}

/**
 * Extract and validate agent API key from request headers.
 * 
 * @throws AgentAuthError if key is missing or invalid
 */
export async function extractAgentAuth(): Promise<AgentAuthContext> {
  const headerStore = await headers();
  const agentName = resolveAgentName(headerStore.get(AGENT_NAME_HEADER));

  let key: string;
  try {
    key = parseAgentAuthorizationHeader(headerStore.get('authorization'));
  } catch (error) {
    throw new AgentAuthError((error as Error).message);
  }

  const keyHashRecord = await agentApiKeyRepository.findByKeyHash(
    // Fast lookup by deterministic hash; verifyAgentApiKey still performs timing-safe comparison.
    hashAgentApiKey(key)
  );

  if (!keyHashRecord || !verifyAgentApiKey(key, keyHashRecord.keyHash)) {
    throw new AgentAuthError('Invalid API key');
  }

  await agentApiKeyRepository.touchUsage(keyHashRecord.id, agentName).catch(() => {});

  return {
    keyId: keyHashRecord.id,
    orgId: keyHashRecord.orgId,
    userId: keyHashRecord.createdBy,
    agentName,
    keyPrefix: keyHashRecord.keyPrefix,
    authMethod: 'tenant_api_key',
  };
}
