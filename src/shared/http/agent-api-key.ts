import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export const AGENT_API_KEY_PREFIX = 'agk_';
export const AGENT_NAME_HEADER = 'x-agent-name';
export const DEFAULT_AGENT_NAME = 'External Agent';
const AGENT_API_KEY_BYTES = 24;

export interface GeneratedAgentApiKey {
  token: string;
  keyHash: string;
  keyPrefix: string;
}

export function hashAgentApiKey(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyAgentApiKey(token: string, storedHash: string): boolean {
  const computedHash = hashAgentApiKey(token);
  const computedBuffer = Buffer.from(computedHash, 'utf8');
  const storedBuffer = Buffer.from(storedHash, 'utf8');

  if (computedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(computedBuffer, storedBuffer);
}

export function generateAgentApiKey(): GeneratedAgentApiKey {
  const randomPart = randomBytes(AGENT_API_KEY_BYTES).toString('hex');
  const token = `${AGENT_API_KEY_PREFIX}${randomPart}`;

  return {
    token,
    keyHash: hashAgentApiKey(token),
    keyPrefix: token.slice(-4),
  };
}

export function parseAgentAuthorizationHeader(authHeader: string | null): string {
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid Authorization format. Use: Bearer agk_xxx');
  }

  const token = authHeader.slice(7).trim();
  if (!token.startsWith(AGENT_API_KEY_PREFIX)) {
    throw new Error('Invalid API key format. Keys start with agk_');
  }

  return token;
}

export function resolveAgentName(headerValue: string | null | undefined): string {
  const candidate = headerValue?.trim();
  return candidate ? candidate.slice(0, 120) : DEFAULT_AGENT_NAME;
}
