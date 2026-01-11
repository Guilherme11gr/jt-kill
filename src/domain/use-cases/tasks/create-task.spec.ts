import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTask } from './create-task';
import type { TaskRepository } from '@/infra/adapters/prisma';
import type { Task } from '@/shared/types';

describe('createTask', () => {
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

  it('should create a task successfully', async () => {
    const input = {
      orgId: 'org-1',
      featureId: 'feat-1',
      title: 'New Task',
      projectId: 'proj-1',
      description: 'Task description',
      type: 'TASK' as const,
      priority: 'MEDIUM' as const,
      points: 3 as const,
    };

    const expectedTask: Task = {
      id: 'task-1',
      orgId: input.orgId,
      featureId: input.featureId,
      projectId: 'proj-1',
      localId: 1,
      title: input.title,
      description: input.description,
      status: 'TODO',
      type: input.type,
      priority: input.priority,
      points: input.points,
      createdAt: new Date(),
      updatedAt: new Date(),
      modules: [],
      assigneeId: null, // default
      blocked: false,
      statusChangedAt: null,
    };

    vi.mocked(mockRepo.create).mockResolvedValue(expectedTask);

    const result = await createTask(input, {
      taskRepository: mockRepo,
      featureRepository: { findById: vi.fn().mockResolvedValue({ id: 'feat-1' }) } as any
    });

    expect(result).toEqual(expectedTask);
    expect(mockRepo.create).toHaveBeenCalledWith(input);
  });
});
