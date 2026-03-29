import { describe, expect, it, vi } from 'vitest';
import { buildAgentChatSystemPrompt, buildAgentChatTools } from './tools';
import { InternalAgentApiClient } from './internal-api';

const context = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  role: 'OWNER' as const,
  orgName: 'Fluxo',
  orgSlug: 'fluxo',
  userDisplayName: 'Koike',
  origin: 'https://fluxo.test',
  cookieHeader: null,
};

function getTool(name: string) {
  const tool = buildAgentChatTools(context).find((candidate) => candidate.name === name);

  expect(tool).toBeDefined();

  return tool as {
    execute: (args: Record<string, unknown>) => Promise<unknown>;
  };
}

describe('agent-chat/tools', () => {
  it('includes instructions for discovery and safe tool usage', () => {
    const prompt = buildAgentChatSystemPrompt(context);

    expect(prompt).toContain('Quando o usuário não souber IDs');
    expect(prompt).toContain('list_users');
    expect(prompt).toContain('list_task_tags');
    expect(prompt).toContain('bulk_update_features');
  });

  it('ships the discovery and tagging tools needed for conversational usage', () => {
    const toolNames = buildAgentChatTools(context).map((tool) => tool.name);

    expect(toolNames).toContain('list_users');
    expect(toolNames).toContain('list_task_tags');
    expect(toolNames).toContain('get_task_tags');
    expect(toolNames).toContain('set_task_tags');
    expect(toolNames).toContain('bulk_update_features');
  });

  it('updates a feature by title when the model does not provide the id', async () => {
    const resolveFeatureId = vi
      .spyOn(InternalAgentApiClient.prototype, 'resolveFeatureId')
      .mockResolvedValue('feature-123');
    const patch = vi
      .spyOn(InternalAgentApiClient.prototype, 'patch')
      .mockResolvedValue({ id: 'feature-123', status: 'DONE' });

    const updateFeature = getTool('update_feature');

    const result = await updateFeature.execute({
      featureTitle: 'Checkout v2',
      status: 'DONE',
    });

    expect(resolveFeatureId).toHaveBeenCalledWith('Checkout v2', undefined);
    expect(patch).toHaveBeenCalledWith('/api/features/feature-123', { status: 'DONE' });
    expect(result).toEqual({ id: 'feature-123', status: 'DONE' });

    resolveFeatureId.mockRestore();
    patch.mockRestore();
  });

  it('updates multiple features in bulk using titles', async () => {
    const resolveFeatureId = vi
      .spyOn(InternalAgentApiClient.prototype, 'resolveFeatureId')
      .mockResolvedValueOnce('feature-1')
      .mockResolvedValueOnce('feature-2');
    const patch = vi
      .spyOn(InternalAgentApiClient.prototype, 'patch')
      .mockResolvedValueOnce({ id: 'feature-1', status: 'DONE' })
      .mockResolvedValueOnce({ id: 'feature-2', status: 'DONE' });

    const bulkUpdateFeatures = getTool('bulk_update_features');

    const result = await bulkUpdateFeatures.execute({
      items: [
        { featureTitle: 'Checkout v2' },
        { featureTitle: 'Billing API' },
      ],
      status: 'DONE',
    });

    expect(resolveFeatureId).toHaveBeenNthCalledWith(1, 'Checkout v2', undefined);
    expect(resolveFeatureId).toHaveBeenNthCalledWith(2, 'Billing API', undefined);
    expect(patch).toHaveBeenNthCalledWith(1, '/api/features/feature-1', { status: 'DONE' });
    expect(patch).toHaveBeenNthCalledWith(2, '/api/features/feature-2', { status: 'DONE' });
    expect(result).toEqual({
      count: 2,
      features: [
        { id: 'feature-1', status: 'DONE' },
        { id: 'feature-2', status: 'DONE' },
      ],
    });

    resolveFeatureId.mockRestore();
    patch.mockRestore();
  });
});
