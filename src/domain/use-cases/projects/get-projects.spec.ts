import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProjects } from './get-projects';
import type { ProjectRepository } from '@/infra/adapters/prisma';
import type { Project } from '@/shared/types';

describe('getProjects', () => {
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

  it('should return projects for the organization', async () => {
    const orgId = 'org-1';
    const expectedProjects: (Project & { _count: { epics: number; tasks: number } })[] = [
      {
        id: 'proj-1',
        orgId,
        name: 'Project 1',
        key: 'PROJ1',
        description: null,
        modules: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { epics: 0, tasks: 0 },
      },
      {
        id: 'proj-2',
        orgId,
        name: 'Project 2',
        key: 'PROJ2',
        description: null,
        modules: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { epics: 0, tasks: 0 },
      },
    ];

    vi.mocked(mockRepo.findMany).mockResolvedValue(expectedProjects);

    const result = await getProjects(orgId, { projectRepository: mockRepo });

    expect(result).toEqual(expectedProjects);
    expect(mockRepo.findMany).toHaveBeenCalledWith(orgId);
  });
});
