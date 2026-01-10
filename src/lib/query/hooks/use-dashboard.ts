/**
 * Dashboard Hooks - React Query
 * 
 * Hooks otimizados para a nova dashboard de comando:
 * - useMyTasks: Tasks do usuário ordenadas por ação
 * - useActiveProjects: Projetos com tasks ativas
 * - useActivityFeed: Mudanças recentes em tasks relacionadas
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { CACHE_TIMES } from '../cache-config';
import { useCurrentOrgId, isOrgIdValid } from './use-org-id';
import type { TaskWithReadableId } from '@/shared/types';

// ============ Types ============

export interface MyTasksResponse {
  items: TaskWithReadableId[];
  total: number;
}

export interface ActiveProject {
  id: string;
  name: string;
  key: string;
  taskCount: number;
  bugCount: number;
  blockedCount: number;
  health: {
    status: 'healthy' | 'attention' | 'critical';
    stagnatedTasks: number;
    oldBlockedTasks: number;
    unassignedCritical: number;
  };
}

export interface ActiveProjectsResponse {
  items: ActiveProject[];
  total: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  actorId: string;
  actorName: string | null;
  targetType: string | null;
  targetId: string | null;
  targetTitle: string | null;
  targetReadableId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  humanMessage: string;
}

export interface ActivityResponse {
  items: ActivityItem[];
  total: number;
}

// ============ Fetch Functions ============

async function fetchMyTasks(includeDone = false, teamView = false): Promise<MyTasksResponse> {
  const params = new URLSearchParams();
  if (includeDone) params.set('includeDone', 'true');
  if (teamView) params.set('teamView', 'true');

  const res = await fetch(`/api/dashboard/my-tasks?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch my tasks');
  const json = await res.json();
  return json.data;
}

async function fetchActiveProjects(): Promise<ActiveProjectsResponse> {
  const res = await fetch('/api/dashboard/active-projects');
  if (!res.ok) throw new Error('Failed to fetch active projects');
  const json = await res.json();
  return json.data;
}

async function fetchActivity(hours = 24): Promise<ActivityResponse> {
  const res = await fetch(`/api/dashboard/activity?hours=${hours}`);
  if (!res.ok) throw new Error('Failed to fetch activity');
  const json = await res.json();
  return json.data;
}

// ============ Hooks ============

/**
 * Fetch current user's tasks sorted for action:
 * 1. Blocked first
 * 2. Bugs
 * 3. By priority
 * 4. By last update
 * 
 * Options:
 * - includeDone: incluir tasks DONE
 * - teamView: mostrar tasks de todos os projetos (não apenas assigned)
 * 
 * Excludes DONE by default.
 */
export function useMyTasks(options?: { includeDone?: boolean; teamView?: boolean }) {
  const includeDone = options?.includeDone ?? false;
  const teamView = options?.teamView ?? false;
  const orgId = useCurrentOrgId();

  return useQuery({
    queryKey: queryKeys.dashboard.myTasks(orgId, includeDone, teamView),
    queryFn: () => fetchMyTasks(includeDone, teamView),
    enabled: isOrgIdValid(orgId),
    ...CACHE_TIMES.FRESH,
  });
}

/**
 * Fetch projects where user has active tasks
 */
export function useActiveProjects() {
  const orgId = useCurrentOrgId();
  
  return useQuery({
    queryKey: queryKeys.dashboard.activeProjects(orgId),
    queryFn: fetchActiveProjects,
    enabled: isOrgIdValid(orgId),
    ...CACHE_TIMES.FRESH,
  });
}

/**
 * Fetch recent activity on user's tasks (by others)
 */
export function useActivityFeed(hours = 24) {
  const orgId = useCurrentOrgId();
  
  return useQuery({
    queryKey: queryKeys.dashboard.activity(orgId, hours),
    queryFn: () => fetchActivity(hours),
    enabled: isOrgIdValid(orgId),
    ...CACHE_TIMES.FRESH,
    // Refetch periodically for fresh activity
    refetchInterval: 60000, // 1 minute
  });
}
