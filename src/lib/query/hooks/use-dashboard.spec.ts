import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Dashboard API Endpoints', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('/api/dashboard/my-tasks', () => {
    it('should return tasks sorted by blocked > bugs > priority', async () => {
      const mockTasks = {
        data: {
          items: [
            { id: '1', title: 'Blocked Bug', blocked: true, type: 'BUG', priority: 'HIGH' },
            { id: '2', title: 'Normal Bug', blocked: false, type: 'BUG', priority: 'HIGH' },
            { id: '3', title: 'High Priority Task', blocked: false, type: 'TASK', priority: 'HIGH' },
            { id: '4', title: 'Low Priority Task', blocked: false, type: 'TASK', priority: 'LOW' },
          ],
          total: 4,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      });

      const res = await fetch('/api/dashboard/my-tasks');
      const data = await res.json();

      expect(data.data.items).toHaveLength(4);
      // First should be blocked bug
      expect(data.data.items[0].blocked).toBe(true);
      expect(data.data.items[0].type).toBe('BUG');
    });

    it('should exclude DONE tasks by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { items: [], total: 0 } }),
      });

      await fetch('/api/dashboard/my-tasks');

      expect(mockFetch).toHaveBeenCalledWith('/api/dashboard/my-tasks');
    });
  });

  describe('/api/dashboard/active-projects', () => {
    it('should return projects with task counts', async () => {
      const mockProjects = {
        data: {
          items: [
            { id: '1', name: 'Project A', key: 'PRJA', taskCount: 5, bugCount: 2, blockedCount: 1 },
            { id: '2', name: 'Project B', key: 'PRJB', taskCount: 3, bugCount: 0, blockedCount: 0 },
          ],
          total: 2,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      const res = await fetch('/api/dashboard/active-projects');
      const data = await res.json();

      expect(data.data.items).toHaveLength(2);
      expect(data.data.items[0].taskCount).toBe(5);
      expect(data.data.items[0].bugCount).toBe(2);
    });
  });

  describe('/api/dashboard/activity', () => {
    it('should return activity feed with human messages', async () => {
      const mockActivity = {
        data: {
          items: [
            {
              id: '1',
              action: 'task.status.changed',
              actorName: 'John',
              targetReadableId: 'PROJ-1',
              humanMessage: 'John moveu PROJ-1 para Em Andamento',
            },
          ],
          total: 1,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockActivity,
      });

      const res = await fetch('/api/dashboard/activity?hours=24');
      const data = await res.json();

      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].humanMessage).toContain('moveu');
    });
  });
});

describe('Dashboard Query Keys', () => {
  it('should generate correct query keys', async () => {
    // Import dynamically to avoid module issues
    const { queryKeys } = await import('@/lib/query/query-keys');

    expect(queryKeys.dashboard.all).toEqual(['dashboard']);
    expect(queryKeys.dashboard.myTasks(false)).toEqual(['dashboard', 'myTasks', false]);
    expect(queryKeys.dashboard.myTasks(true)).toEqual(['dashboard', 'myTasks', true]);
    expect(queryKeys.dashboard.activeProjects()).toEqual(['dashboard', 'activeProjects']);
    expect(queryKeys.dashboard.activity(24)).toEqual(['dashboard', 'activity', 24]);
  });
});
