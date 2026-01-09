import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/**
 * Invalidate all dashboard-related queries.
 * Use this when an entity change might affect the dashboard (tasks, projects, comments).
 */
export function invalidateDashboardQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.myTasks() });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.activity() });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.activeProjects() });
}
