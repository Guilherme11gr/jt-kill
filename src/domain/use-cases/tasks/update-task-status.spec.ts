import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateTaskStatus } from './update-task-status';
import { NotFoundError } from '@/shared/errors';
import type { TaskRepository } from '@/infra/adapters/prisma';
import type { Task } from '@/shared/types';

describe('updateTaskStatus', () => {
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

  it('should update the task status successfully', async () => {
    const id = 'task-1';
    const orgId = 'org-1';
    const newStatus = 'IN_PROGRESS';

    const existingTask: Task = {
      id,
      orgId,
      featureId: 'feat-1',
      projectId: 'proj-1',
      localId: 1,
      title: 'Task 1',
      status: 'TODO',
      type: 'STORY',
      priority: 'MEDIUM',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedTask: Task = {
      ...existingTask,
      status: newStatus,
      updatedAt: new Date(),
    };

    vi.mocked(mockRepo.findById).mockResolvedValue(existingTask);
    vi.mocked(mockRepo.updateStatus).mockResolvedValue(updatedTask);

    const result = await updateTaskStatus(id, orgId, newStatus, { taskRepository: mockRepo });

    expect(result).toEqual(updatedTask);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(id, orgId, newStatus);
  });

  it('should throw NotFoundError if task does not exist', async () => {
    const id = 'task-1';
    const orgId = 'org-1';
    const newStatus = 'IN_PROGRESS';

    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(updateTaskStatus(id, orgId, newStatus, { taskRepository: mockRepo }))
      .rejects.toThrow(NotFoundError);
  });
});
