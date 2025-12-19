import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteTask } from './delete-task';
import { NotFoundError } from '@/shared/errors';
import type { TaskRepository } from '@/infra/adapters/prisma';

describe('deleteTask', () => {
  const mockRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  } as unknown as TaskRepository;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete the task successfully', async () => {
    const id = 'task-1';
    const orgId = 'org-1';

    vi.mocked(mockRepo.delete).mockResolvedValue(true);

    await deleteTask(id, orgId, { taskRepository: mockRepo });

    expect(mockRepo.delete).toHaveBeenCalledWith(id, orgId);
  });

  it('should throw NotFoundError if task does not exist', async () => {
    const id = 'task-1';
    const orgId = 'org-1';

    vi.mocked(mockRepo.delete).mockResolvedValue(false);

    await expect(deleteTask(id, orgId, { taskRepository: mockRepo }))
      .rejects.toThrow(NotFoundError);
  });
});
