/**
 * Agent API Authentication Helpers
 * 
 * Simple API key authentication for external agents/automations.
 * Keys are stored as environment variables for simplicity.
 * 
 * Auth header format: Authorization: Bearer agk_xxxxxxxxxxxx
 * 
 * Environment variables:
 * - AGENT_API_KEY: The API key that agents must provide
 * - AGENT_ORG_ID: The organization ID that the agent operates under
 */

import { headers } from 'next/headers';
import { timingSafeEqual } from 'crypto';

export interface AgentAuthContext {
  orgId: string;
  userId: string; // User ID for audit trail (e.g., AI agent user)
  agentName: string; // Agent name for audit metadata (e.g., 'Gepeto')
  keyPrefix: string; // Last 4 chars for logging
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
  const authHeader = headerStore.get('authorization');

  if (!authHeader) {
    throw new AgentAuthError('Missing Authorization header');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new AgentAuthError('Invalid Authorization format. Use: Bearer agk_xxx');
  }

  const key = authHeader.substring(7); // Remove 'Bearer '

  if (!key.startsWith('agk_')) {
    throw new AgentAuthError('Invalid API key format. Keys start with agk_');
  }

  // Validate against environment variable
  const validKey = process.env.AGENT_API_KEY;
  const orgId = process.env.AGENT_ORG_ID;
  const userId = process.env.AGENT_USER_ID; // User ID for audit logs
  const agentName = process.env.AGENT_NAME || 'Gepeto'; // Agent name for audit metadata

  if (!validKey || !orgId || !userId) {
    throw new AgentAuthError('Agent API not configured', 503);
  }

  // Timing-safe comparison to prevent timing attacks
  const keyBuffer = Buffer.from(key);
  const validKeyBuffer = Buffer.from(validKey);

  if (keyBuffer.length !== validKeyBuffer.length || !timingSafeEqual(keyBuffer, validKeyBuffer)) {
    throw new AgentAuthError('Invalid API key');
  }

  return {
    orgId,
    userId,
    agentName,
    keyPrefix: key.slice(-4),
  };
}
