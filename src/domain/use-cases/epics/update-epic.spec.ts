import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateEpic } from './update-epic';
import { NotFoundError } from '@/shared/errors';
import type { EpicRepository } from '@/infra/adapters/prisma';
import type { Epic } from '@/shared/types';

describe('updateEpic', () => {
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

  it('should update the epic successfully', async () => {
    const id = 'epic-1';
    const orgId = 'org-1';
    const input = {
      title: 'Updated Epic',
      status: 'IN_PROGRESS' as const,
    };

    const existingEpic: Epic = {
      id,
      orgId,
      projectId: 'proj-1',
      title: 'Old Epic',
      status: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedEpic: Epic = {
      ...existingEpic,
      ...input,
      updatedAt: new Date(),
    };

    vi.mocked(mockRepo.findById).mockResolvedValue(existingEpic);
    vi.mocked(mockRepo.update).mockResolvedValue(updatedEpic);

    const result = await updateEpic(id, orgId, input, { epicRepository: mockRepo });

    expect(result).toEqual(updatedEpic);
    expect(mockRepo.update).toHaveBeenCalledWith(id, orgId, input);
  });

  it('should throw NotFoundError if epic does not exist', async () => {
    const id = 'epic-1';
    const orgId = 'org-1';
    const input = { title: 'Updated Epic' };

    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(updateEpic(id, orgId, input, { epicRepository: mockRepo }))
      .rejects.toThrow(NotFoundError);
  });
});
