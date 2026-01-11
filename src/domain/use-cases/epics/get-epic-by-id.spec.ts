import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEpicById } from './get-epic-by-id';
import { NotFoundError } from '@/shared/errors';
import type { EpicRepository } from '@/infra/adapters/prisma';
import type { Epic } from '@/shared/types';

describe('getEpicById', () => {
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

  it('should return the epic if found', async () => {
    const id = 'epic-1';
    const orgId = 'org-1';
    const expectedEpic: Epic = {
      id,
      orgId,
      projectId: 'proj-1',
      title: 'Epic 1',
      status: 'OPEN',
      description: null,
      risk: 'low',
      riskUpdatedAt: new Date(),
      riskReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockRepo.findById).mockResolvedValue(expectedEpic);

    const result = await getEpicById(id, orgId, { epicRepository: mockRepo });

    expect(result).toEqual(expectedEpic);
    expect(mockRepo.findById).toHaveBeenCalledWith(id, orgId);
  });

  it('should throw NotFoundError if epic is not found', async () => {
    const id = 'epic-1';
    const orgId = 'org-1';

    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(getEpicById(id, orgId, { epicRepository: mockRepo }))
      .rejects.toThrow(NotFoundError);
  });
});
