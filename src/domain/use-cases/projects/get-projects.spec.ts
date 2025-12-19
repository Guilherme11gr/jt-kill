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
    const expectedProjects: Project[] = [
      {
        id: 'proj-1',
        orgId,
        name: 'Project 1',
        key: 'P1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'proj-2',
        orgId,
        name: 'Project 2',
        key: 'P2',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(mockRepo.findMany).mockResolvedValue(expectedProjects);

    const result = await getProjects(orgId, { projectRepository: mockRepo });

    expect(result).toEqual(expectedProjects);
    expect(mockRepo.findMany).toHaveBeenCalledWith(orgId);
  });
});
