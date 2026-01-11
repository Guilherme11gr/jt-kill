import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateTask } from './update-task';
import { NotFoundError } from '@/shared/errors';
import type { TaskRepository } from '@/infra/adapters/prisma';
import type { Task } from '@/shared/types';

describe('updateTask', () => {
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

  it('should update the task successfully', async () => {
    const id = 'task-1';
    const orgId = 'org-1';
    const input = {
      title: 'Updated Task',
      points: 5 as const,
    };

    const existingTask: Task = {
      id,
      orgId,
      featureId: 'feat-1',
      projectId: 'proj-1',
      localId: 1,
      title: 'Old Task',
      status: 'TODO',
      type: 'TASK',
      priority: 'MEDIUM',
      points: 3,
      description: null,
      modules: [],
      assigneeId: null,
      blocked: false,
      statusChangedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedTask: Task = {
      ...existingTask,
      ...input,
      updatedAt: new Date(),
    };

    vi.mocked(mockRepo.findById).mockResolvedValue(existingTask);
    vi.mocked(mockRepo.update).mockResolvedValue(updatedTask);

    const result = await updateTask(id, orgId, input, { taskRepository: mockRepo });

    expect(result).toEqual(updatedTask);
    expect(mockRepo.update).toHaveBeenCalledWith(id, orgId, input);
  });

  it('should throw NotFoundError if task does not exist', async () => {
    const id = 'task-1';
    const orgId = 'org-1';
    const input = { title: 'Updated Task' };

    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(updateTask(id, orgId, input, { taskRepository: mockRepo }))
      .rejects.toThrow(NotFoundError);
  });
});
