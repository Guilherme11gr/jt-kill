import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteProject } from './delete-project';
import { NotFoundError } from '@/shared/errors';
import type { ProjectRepository } from '@/infra/adapters/prisma';

describe('deleteProject', () => {
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

  it('should delete the project successfully', async () => {
    const id = 'proj-1';
    const orgId = 'org-1';

    vi.mocked(mockRepo.delete).mockResolvedValue(true);

    await deleteProject(id, orgId, { projectRepository: mockRepo });

    expect(mockRepo.delete).toHaveBeenCalledWith(id, orgId);
  });

  it('should throw NotFoundError if project does not exist', async () => {
    const id = 'proj-1';
    const orgId = 'org-1';

    vi.mocked(mockRepo.delete).mockResolvedValue(false);

    await expect(deleteProject(id, orgId, { projectRepository: mockRepo }))
      .rejects.toThrow(NotFoundError);
  });
});
