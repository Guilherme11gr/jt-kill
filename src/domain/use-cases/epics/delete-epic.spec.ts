import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteEpic } from './delete-epic';
import { NotFoundError } from '@/shared/errors';
import type { EpicRepository } from '@/infra/adapters/prisma';

describe('deleteEpic', () => {
  const mockRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findManyWithStats: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as EpicRepository;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete the epic successfully', async () => {
    const id = 'epic-1';
    const orgId = 'org-1';

    vi.mocked(mockRepo.delete).mockResolvedValue(true);

    await deleteEpic(id, orgId, { epicRepository: mockRepo });

    expect(mockRepo.delete).toHaveBeenCalledWith(id, orgId);
  });

  it('should throw NotFoundError if epic does not exist', async () => {
    const id = 'epic-1';
    const orgId = 'org-1';

    vi.mocked(mockRepo.delete).mockResolvedValue(false);

    await expect(deleteEpic(id, orgId, { epicRepository: mockRepo }))
      .rejects.toThrow(NotFoundError);
  });
});
