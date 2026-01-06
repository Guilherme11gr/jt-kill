import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { CACHE_TIMES } from '../cache-config';
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
}

interface CreateFeatureInput {
  title: string;
  description?: string;
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
    body: JSON.stringify({ title: data.title, description: data.description }),
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
 */
export function useCreateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFeature,
    onSuccess: (newFeature, variables) => {
      // 1. Update the list by epic
      queryClient.setQueryData<Feature[]>(queryKeys.features.list(variables.epicId), (old) => {
        if (!old) return [newFeature];
        return [...old, newFeature];
      });

      // 2. Update the all-list if it exists
      queryClient.setQueryData<Feature[]>(queryKeys.features.list(), (old) => {
        if (!old) return old; // Don't create if not cached
        return [...old, newFeature];
      });

      // 3. Invalidate
      queryClient.invalidateQueries({ queryKey: queryKeys.features.list(variables.epicId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.features.list() });

      toast.success('Feature criada');
    },
    onError: () => {
      toast.error('Erro ao criar feature');
    },
  });
}

/**
 * Update a feature
 */
export function useUpdateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.all });
      toast.success('Feature atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar feature');
    },
  });
}

/**
 * Delete a feature
 */
export function useDeleteFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.all });
      toast.success('Feature excluída');
    },
    onError: () => {
      toast.error('Erro ao excluir feature');
    },
  });
}
