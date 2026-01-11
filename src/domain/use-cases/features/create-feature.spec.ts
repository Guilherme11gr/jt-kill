import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFeature } from './create-feature';
import type { FeatureRepository } from '@/infra/adapters/prisma';
import type { Feature } from '@/shared/types';

describe('createFeature', () => {
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

  it('should create a feature successfully', async () => {
    const input = {
      orgId: 'org-1',
      epicId: 'epic-1',
      title: 'New Feature',
      description: 'Feature description',
    };

    const expectedFeature: Feature = {
      id: 'feat-1',
      orgId: input.orgId,
      epicId: input.epicId,
      title: input.title,
      description: input.description,
      status: 'TODO',
      createdAt: new Date(),
      updatedAt: new Date(),
      health: 'healthy',
      healthUpdatedAt: new Date(),
      healthReason: null,
    };

    vi.mocked(mockRepo.create).mockResolvedValue(expectedFeature);

    const result = await createFeature(input, { featureRepository: mockRepo });

    expect(result).toEqual(expectedFeature);
    expect(mockRepo.create).toHaveBeenCalledWith(input);
  });
});
