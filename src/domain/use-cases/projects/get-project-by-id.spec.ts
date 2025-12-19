import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProjectById } from './get-project-by-id';
import { NotFoundError } from '@/shared/errors';
import type { ProjectRepository } from '@/infra/adapters/prisma';
import type { Project } from '@/shared/types';

describe('getProjectById', () => {
  const mockRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as ProjectRepository;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the project if found', async () => {
    const id = 'proj-1';
    const orgId = 'org-1';
    const expectedProject: Project = {
      id,
      orgId,
      name: 'Project 1',
      key: 'P1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockRepo.findById).mockResolvedValue(expectedProject);

    const result = await getProjectById(id, orgId, { projectRepository: mockRepo });

    expect(result).toEqual(expectedProject);
    expect(mockRepo.findById).toHaveBeenCalledWith(id, orgId);
  });

  it('should throw NotFoundError if project is not found', async () => {
    const id = 'proj-1';
    const orgId = 'org-1';

    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(getProjectById(id, orgId, { projectRepository: mockRepo }))
      .rejects.toThrow(NotFoundError);
  });
});
