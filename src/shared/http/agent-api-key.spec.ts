import { describe, expect, it } from 'vitest';
import {
  AGENT_API_KEY_PREFIX,
  generateAgentApiKey,
  hashAgentApiKey,
  parseAgentAuthorizationHeader,
  resolveAgentName,
  verifyAgentApiKey,
} from './agent-api-key';

describe('agent-api-key helpers', () => {
  it('generates an api key with prefix, hash, and suffix metadata', () => {
    const generated = generateAgentApiKey();

    expect(generated.token.startsWith(AGENT_API_KEY_PREFIX)).toBe(true);
    expect(generated.keyPrefix).toHaveLength(4);
    expect(generated.keyHash).toBe(hashAgentApiKey(generated.token));
    expect(verifyAgentApiKey(generated.token, generated.keyHash)).toBe(true);
  });

  it('rejects invalid authorization formats', () => {
    expect(() => parseAgentAuthorizationHeader(null)).toThrow('Missing Authorization header');
    expect(() => parseAgentAuthorizationHeader('Basic abc')).toThrow('Invalid Authorization format. Use: Bearer agk_xxx');
    expect(() => parseAgentAuthorizationHeader('Bearer nope')).toThrow('Invalid API key format. Keys start with agk_');
  });

  it('normalizes the agent name header', () => {
    expect(resolveAgentName(undefined)).toBe('External Agent');
    expect(resolveAgentName('  Claude Desktop  ')).toBe('Claude Desktop');
  });

  it('fails verification for a different token', () => {
    const generated = generateAgentApiKey();

    expect(verifyAgentApiKey(`${generated.token}x`, generated.keyHash)).toBe(false);
  });
});
