import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEpics } from './get-epics';
import type { EpicRepository } from '@/infra/adapters/prisma';
import type { Epic } from '@/shared/types';

describe('getEpics', () => {
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

  it('should return epics for the project', async () => {
    const projectId = 'proj-1';
    const orgId = 'org-1';
    const expectedEpics: (Epic & { _count: { features: number } })[] = [
      {
        id: 'epic-1',
        orgId,
        projectId,
        title: 'Epic 1',
        status: 'OPEN',
        description: null,
        risk: 'low',
        riskUpdatedAt: new Date(),
        riskReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { features: 0 },
      },
    ];

    vi.mocked(mockRepo.findManyWithStats).mockResolvedValue(expectedEpics);

    const result = await getEpics(projectId, orgId, { epicRepository: mockRepo });

    expect(result).toEqual(expectedEpics);
    expect(mockRepo.findManyWithStats).toHaveBeenCalledWith(projectId, orgId);
  });
});
