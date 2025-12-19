import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteFeature } from './delete-feature';
import { NotFoundError } from '@/shared/errors';
import type { FeatureRepository } from '@/infra/adapters/prisma';

describe('deleteFeature', () => {
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

  it('should delete the feature successfully', async () => {
    const id = 'feat-1';
    const orgId = 'org-1';

    vi.mocked(mockRepo.delete).mockResolvedValue(true);

    await deleteFeature(id, orgId, { featureRepository: mockRepo });

    expect(mockRepo.delete).toHaveBeenCalledWith(id, orgId);
  });

  it('should throw NotFoundError if feature does not exist', async () => {
    const id = 'feat-1';
    const orgId = 'org-1';

    vi.mocked(mockRepo.delete).mockResolvedValue(false);

    await expect(deleteFeature(id, orgId, { featureRepository: mockRepo }))
      .rejects.toThrow(NotFoundError);
  });
});
