import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { CACHE_TIMES } from '../cache-config';
import { smartInvalidate } from '../helpers';
import { toast } from 'sonner';

// ============ Types ============

interface Feature {
  id: string;
  title: string;
  description?: string | null;
  epicId: string;
  status: string;
  epic?: {
    id: string;
    title: string;
    projectId: string;
    project?: {
      id: string;
      name: string;
      key: string;
    };
  };
  _count?: {
    tasks: number;
  };
  tasks?: Array<{
    status: string;
    type: string;
  }>;
  // Health check fields
  health?: 'healthy' | 'warning' | 'critical';
  healthReason?: string | null;
  healthUpdatedAt?: string | null;
}

interface CreateFeatureInput {
  title: string;
  description?: string;
  status?: 'BACKLOG' | 'TODO' | 'DOING' | 'DONE';
  epicId: string;
}

interface UpdateFeatureInput {
  id: string;
  data: Partial<Omit<CreateFeatureInput, 'epicId'>> & {
    status?: 'BACKLOG' | 'TODO' | 'DOING' | 'DONE';
  };
}

// ============ Fetch Functions ============

async function fetchFeature(id: string): Promise<Feature> {
  const res = await fetch(`/api/features/${id}`);
  if (!res.ok) throw new Error('Failed to fetch feature');
  const json = await res.json();
  return json.data;
}

async function fetchFeatures(): Promise<Feature[]> {
  const res = await fetch('/api/features');
  if (!res.ok) throw new Error('Failed to fetch features');
  const json = await res.json();
  return json.data || [];
}

async function fetchFeaturesByEpic(epicId: string): Promise<Feature[]> {
  const res = await fetch(`/api/epics/${epicId}/features`);
  if (!res.ok) throw new Error('Failed to fetch features');
  const json = await res.json();
  return json.data || [];
}

async function createFeature(data: CreateFeatureInput): Promise<Feature> {
  const res = await fetch(`/api/epics/${data.epicId}/features`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      title: data.title, 
      description: data.description,
      status: data.status,
    }),
  });
  if (!res.ok) throw new Error('Failed to create feature');
  const json = await res.json();
  return json.data;
}

async function updateFeature({ id, data }: UpdateFeatureInput): Promise<Feature> {
  const res = await fetch(`/api/features/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update feature');
  const json = await res.json();
  return json.data;
}

async function deleteFeature(id: string): Promise<void> {
  const res = await fetch(`/api/features/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete feature');
}

// ============ Hooks ============

/**
 * Fetch a single feature by ID
 */
export function useFeature(id: string) {
  return useQuery({
    queryKey: queryKeys.features.detail(id),
    queryFn: () => fetchFeature(id),
    enabled: Boolean(id),
    ...CACHE_TIMES.STANDARD,
  });
}

/**
 * Fetch all features (for dropdowns)
 */
export function useAllFeatures() {
  return useQuery({
    queryKey: queryKeys.features.list(),
    queryFn: fetchFeatures,
    ...CACHE_TIMES.STANDARD,
  });
}

/**
 * Fetch features for a specific epic
 */
export function useFeaturesByEpic(epicId: string) {
  return useQuery({
    queryKey: queryKeys.features.list(epicId),
    queryFn: () => fetchFeaturesByEpic(epicId),
    enabled: Boolean(epicId),
    ...CACHE_TIMES.STANDARD,
  });
}

// ============ Mutations ============

/**
 * Create a new feature
 * 
 * Strategy: Optimistic update + force refetch
 */
export function useCreateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFeature,
    onSuccess: (newFeature, variables) => {
      // 1. Optimistic update: add to epic's features list
      queryClient.setQueryData<Feature[]>(queryKeys.features.list(variables.epicId), (old) => {
        if (!old) return [newFeature];
        // Avoid duplicates
        if (old.some(f => f.id === newFeature.id)) return old;
        return [...old, newFeature];
      });

      // 2. Optimistic update: add to all-list if cached
      queryClient.setQueryData<Feature[]>(queryKeys.features.allList(), (old) => {
        if (!old) return undefined; // Don't create if not cached
        if (old.some(f => f.id === newFeature.id)) return old;
        return [...old, newFeature];
      });

      // 3. Invalidate with immediate refetch for active queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.features.list(variables.epicId),
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.features.allList(),
        refetchType: 'active'
      });

      // 4. Invalidate epic detail to update counters (e.g., features count)
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.epics.detail(variables.epicId),
        refetchType: 'active'
      });

      toast.success('Feature criada');
    },
    onError: () => {
      toast.error('Erro ao criar feature');
    },
  });
}

/**
 * Update a feature
 * 
 * Strategy: Optimistic update + targeted refetch
 */
export function useUpdateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFeature,
    onSuccess: (updatedFeature, variables) => {
      // 1. Optimistic update: update the specific feature in cache
      queryClient.setQueryData<Feature>(queryKeys.features.detail(variables.id), updatedFeature);

      // 2. Update in lists
      const updateInList = (old: Feature[] | undefined) => {
        if (!old) return old;
        return old.map(f => f.id === updatedFeature.id ? { ...f, ...updatedFeature } : f);
      };

      queryClient.setQueriesData<Feature[]>({ queryKey: queryKeys.features.lists() }, updateInList);
      queryClient.setQueryData<Feature[]>(queryKeys.features.allList(), updateInList);

      // 3. Invalidate with immediate refetch for active queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.features.lists(),
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.features.allList(),
        refetchType: 'active'
      });

      // 4. Invalidate epic detail (status/title changes may affect UI)
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.epics.detail(updatedFeature.epicId),
        refetchType: 'active'
      });

      // 5. Invalidate tasks for this feature (tasks depend on feature.status)
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tasks.list({ featureId: variables.id }),
        refetchType: 'active'
      });

      toast.success('Feature atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar feature');
    },
  });
}

/**
 * Delete a feature
 * 
 * Strategy: Optimistic removal + force refetch
 */
export function useDeleteFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFeature,
    onMutate: async (featureId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.features.all });

      // Snapshot previous data for potential rollback
      const previousAllFeatures = queryClient.getQueryData<Feature[]>(queryKeys.features.allList());

      // Find the feature to get its epicId before deletion
      const featureToDelete = previousAllFeatures?.find(f => f.id === featureId);
      const epicId = featureToDelete?.epicId;

      // Optimistically remove from all-list
      if (previousAllFeatures) {
        queryClient.setQueryData<Feature[]>(
          queryKeys.features.allList(),
          previousAllFeatures.filter(f => f.id !== featureId)
        );
      }

      // Optimistically remove from epic-specific list
      if (epicId) {
        const previousEpicFeatures = queryClient.getQueryData<Feature[]>(queryKeys.features.list(epicId));
        if (previousEpicFeatures) {
          queryClient.setQueryData<Feature[]>(
            queryKeys.features.list(epicId),
            previousEpicFeatures.filter(f => f.id !== featureId)
          );
        }
      }

      return { previousAllFeatures, epicId, featureId };
    },
    onSuccess: (_, deletedFeatureId, context) => {
      // Remove detail and task queries
      queryClient.removeQueries({ queryKey: queryKeys.features.detail(deletedFeatureId) });
      queryClient.removeQueries({ queryKey: queryKeys.tasks.list({ featureId: deletedFeatureId }) });

      // Invalidate all feature lists (smartInvalidate handles active vs inactive)
      smartInvalidate(queryClient, queryKeys.features.lists());
      smartInvalidate(queryClient, queryKeys.features.allList());

      // Invalidate epic detail to update counters
      if (context?.epicId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.epics.detail(context.epicId),
          refetchType: 'active'
        });
      }

      toast.success('Feature excluída');
    },
    onError: (_err, _featureId, context) => {
      // Rollback on error
      if (context?.previousAllFeatures) {
        queryClient.setQueryData(queryKeys.features.allList(), context.previousAllFeatures);
      }
      toast.error('Erro ao excluir feature');
    },
  });
}
