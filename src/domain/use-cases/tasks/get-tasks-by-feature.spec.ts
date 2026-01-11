import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTasksByFeature } from './get-tasks-by-feature';
import type { TaskRepository } from '@/infra/adapters/prisma';
import type { TaskWithReadableId } from '@/shared/types';

describe('getTasksByFeature', () => {
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

  it('should return tasks for the feature', async () => {
    const featureId = 'feat-1';
    const orgId = 'org-1';
    const expectedTasks: TaskWithReadableId[] = [
      {
        id: 'task-1',
        orgId,
        featureId,
        projectId: 'proj-1',
        localId: 1,
        readableId: 'PROJ-1',
        title: 'Task 1',
        status: 'TODO',
        type: 'TASK',
        priority: 'MEDIUM',
        description: null,
        modules: [],
        assigneeId: null,
        blocked: false,
        statusChangedAt: new Date(),
        points: null,
        feature: {} as any,
        assignee: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(mockRepo.findMany).mockResolvedValue(expectedTasks);

    const result = await getTasksByFeature(featureId, orgId, { taskRepository: mockRepo });

    expect(result).toEqual(expectedTasks);
    expect(mockRepo.findMany).toHaveBeenCalledWith(orgId, { featureId });
  });
});
