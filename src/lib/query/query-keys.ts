import type { TaskFiltersState } from '@/components/features/tasks';

/**
 * Query Keys Factory
 * 
 * Centralized, type-safe query key definitions.
 * Uses factory pattern for parameterized keys.
 * 
 * @example
 * // List with filters
 * queryKeys.tasks.list({ status: 'DOING' })
 * // => ['tasks', 'list', { status: 'DOING' }]
 * 
 * // Detail by ID
 * queryKeys.tasks.detail('uuid-123')
 * // => ['tasks', 'detail', 'uuid-123']
 */
export const queryKeys = {
  // ============ TASKS ============
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters?: Partial<TaskFiltersState>) =>
      [...queryKeys.tasks.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
  },

  // ============ PROJECTS ============
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: () => [...queryKeys.projects.lists()] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },

  // ============ EPICS ============
  epics: {
    all: ['epics'] as const,
    lists: () => [...queryKeys.epics.all, 'list'] as const,
    list: (projectId: string) => [...queryKeys.epics.lists(), projectId] as const,
    details: () => [...queryKeys.epics.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.epics.details(), id] as const,
  },

  // ============ FEATURES ============
  features: {
    all: ['features'] as const,
    lists: () => [...queryKeys.features.all, 'list'] as const,
    list: (epicId?: string) => [...queryKeys.features.lists(), epicId] as const,
    details: () => [...queryKeys.features.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.features.details(), id] as const,
  },

  // ============ USER ============
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
  },
} as const;

// Type helper for extracting query key types
export type QueryKeys = typeof queryKeys;
