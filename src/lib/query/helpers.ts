import { QueryClient, type InvalidateQueryFilters } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/**
 * ============================================================================
 * CACHE INVALIDATION HELPERS
 * ============================================================================
 * 
 * REGRA DE OURO: Sempre use `smartInvalidate()` para invalidar queries.
 * 
 * Comportamento:
 * - Queries ATIVAS (montadas na UI) → refetch IMEDIATO
 * - Queries INATIVAS → marcadas como STALE (refetch quando montadas)
 * 
 * Isso garante:
 * 1. UI atual atualiza instantaneamente
 * 2. Navegação para outras páginas mostra dados frescos
 * 3. Sem requests desnecessários para queries não visíveis
 * 
 * @see docs/guides/cache-invalidation-patterns.md
 */

/**
 * Invalidação inteligente de queries.
 * 
 * - Queries ativas: refetch imediato
 * - Queries inativas: marcadas stale (refetch ao montar)
 * 
 * @example
 * smartInvalidate(queryClient, queryKeys.tasks.lists());
 * smartInvalidate(queryClient, queryKeys.dashboard.all);
 */
export function smartInvalidate(
  queryClient: QueryClient, 
  queryKey: InvalidateQueryFilters['queryKey']
) {
  queryClient.invalidateQueries({ 
    queryKey,
    refetchType: 'active' // Só refetch queries montadas na UI
  });
}

/**
 * Invalidação múltipla de queries relacionadas.
 * Útil para mutações que afetam várias entidades.
 * 
 * @example
 * smartInvalidateMany(queryClient, [
 *   queryKeys.tasks.lists(),
 *   queryKeys.features.detail(featureId),
 *   queryKeys.dashboard.all
 * ]);
 */
export function smartInvalidateMany(
  queryClient: QueryClient,
  queryKeys: InvalidateQueryFilters['queryKey'][]
) {
  queryKeys.forEach(queryKey => smartInvalidate(queryClient, queryKey));
}

/**
 * Invalidate all dashboard-related queries.
 * Use this when an entity change might affect the dashboard (tasks, projects, comments).
 */
export function invalidateDashboardQueries(queryClient: QueryClient) {
  smartInvalidateMany(queryClient, [
    queryKeys.dashboard.myTasks(),
    queryKeys.dashboard.activity(),
    queryKeys.dashboard.activeProjects(),
  ]);
}

/**
 * Invalidate all task-related queries.
 * Use after task mutations to ensure all views are updated.
 */
export function invalidateTaskQueries(queryClient: QueryClient, featureId?: string) {
  const keys: InvalidateQueryFilters['queryKey'][] = [
    queryKeys.tasks.lists(),
  ];
  
  if (featureId) {
    keys.push(queryKeys.features.detail(featureId));
  }
  
  smartInvalidateMany(queryClient, keys);
  invalidateDashboardQueries(queryClient);
}

/**
 * Invalidate all epic-related queries.
 */
export function invalidateEpicQueries(queryClient: QueryClient, projectId?: string) {
  const keys: InvalidateQueryFilters['queryKey'][] = [
    queryKeys.epics.lists(),
    queryKeys.epics.allList(),
  ];
  
  if (projectId) {
    keys.push(queryKeys.projects.detail(projectId));
  }
  
  smartInvalidateMany(queryClient, keys);
}

/**
 * Invalidate all feature-related queries.
 */
export function invalidateFeatureQueries(queryClient: QueryClient, epicId?: string) {
  const keys: InvalidateQueryFilters['queryKey'][] = [
    queryKeys.features.lists(),
    queryKeys.features.allList(),
  ];
  
  if (epicId) {
    keys.push(queryKeys.epics.detail(epicId));
  }
  
  smartInvalidateMany(queryClient, keys);
}
