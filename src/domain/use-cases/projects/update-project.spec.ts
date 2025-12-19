import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateProject } from './update-project';
import { NotFoundError, ValidationError } from '@/shared/errors';
import type { ProjectRepository } from '@/infra/adapters/prisma';
import type { Project } from '@/shared/types';

describe('updateProject', () => {
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

  it('should update the project successfully', async () => {
    const id = 'proj-1';
    const orgId = 'org-1';
    const input = {
      name: 'Updated Project',
      modules: ['kanban'],
    };

    const existingProject: Project = {
      id,
      orgId,
      name: 'Old Project',
      key: 'P1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedProject: Project = {
      ...existingProject,
      ...input,
      updatedAt: new Date(),
    };

    vi.mocked(mockRepo.findById).mockResolvedValue(existingProject);
    vi.mocked(mockRepo.update).mockResolvedValue(updatedProject);

    const result = await updateProject(id, orgId, input, { projectRepository: mockRepo });

    expect(result).toEqual(updatedProject);
    expect(mockRepo.update).toHaveBeenCalledWith(id, orgId, input);
  });

  it('should throw NotFoundError if project does not exist', async () => {
    const id = 'proj-1';
    const orgId = 'org-1';
    const input = { name: 'Updated Project' };

    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(updateProject(id, orgId, input, { projectRepository: mockRepo }))
      .rejects.toThrow(NotFoundError);
  });

  it('should throw ValidationError if modules are duplicated', async () => {
    const id = 'proj-1';
    const orgId = 'org-1';
    const input = {
      modules: ['kanban', 'kanban'],
    };

    const existingProject: Project = {
      id,
      orgId,
      name: 'Old Project',
      key: 'P1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockRepo.findById).mockResolvedValue(existingProject);

    await expect(updateProject(id, orgId, input, { projectRepository: mockRepo }))
      .rejects.toThrow(ValidationError);
  });
});
