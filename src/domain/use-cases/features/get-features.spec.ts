import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFeatures } from './get-features';
import type { FeatureRepository } from '@/infra/adapters/prisma';
import type { Feature } from '@/shared/types';

describe('getFeatures', () => {
  const mockRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findManyWithStats: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as FeatureRepository;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return features for the epic with stats', async () => {
    const epicId = 'epic-1';
    const orgId = 'org-1';
    const expectedFeatures: Array<Feature & { _count: { tasks: number }; tasks: any[] }> = [
      {
        id: 'feat-1',
        orgId,
        epicId,
        title: 'Feature 1',
        description: null,
        status: 'TODO',
        createdAt: new Date(),
        updatedAt: new Date(),
        health: 'healthy',
        healthUpdatedAt: new Date(),
        healthReason: null,
        _count: { tasks: 5 },
        tasks: [],
      },
    ];

    vi.mocked(mockRepo.findManyWithStats).mockResolvedValue(expectedFeatures);

    const result = await getFeatures(epicId, orgId, { featureRepository: mockRepo });

    expect(result).toEqual(expectedFeatures);
    expect(mockRepo.findManyWithStats).toHaveBeenCalledWith(epicId, orgId);
  });
});
