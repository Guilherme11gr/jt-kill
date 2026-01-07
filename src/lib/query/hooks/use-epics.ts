import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { CACHE_TIMES } from '../cache-config';
import { toast } from 'sonner';

// ============ Types ============

interface Epic {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  projectId: string;
  _count?: { features: number };
  aiSummary?: string | null;
  lastAnalyzedAt?: string | null;
  // Health check fields
  risk?: 'low' | 'medium' | 'high';
  riskReason?: string | null;
  riskUpdatedAt?: string | null;
}

interface CreateEpicInput {
  title: string;
  description?: string;
  projectId: string;
}

interface UpdateEpicInput {
  id: string;
  data: Partial<Omit<CreateEpicInput, 'projectId'>>;
}


// ============ Fetch Functions ============

async function fetchEpic(id: string): Promise<Epic> {
  const res = await fetch(`/api/epics/${id}`);
  if (!res.ok) throw new Error('Failed to fetch epic');
  const json = await res.json();
  return json.data;
}

async function fetchAllEpics(): Promise<Epic[]> {
  // Single query - no N+1
  const res = await fetch('/api/epics');
  if (!res.ok) throw new Error('Failed to fetch epics');
  const json = await res.json();
  return json.data || [];
}

async function fetchEpics(projectId: string): Promise<Epic[]> {
  const res = await fetch(`/api/projects/${projectId}/epics`);
  if (!res.ok) throw new Error('Failed to fetch epics');
  const json = await res.json();
  return (json.data || []).map((e: Epic) => ({ ...e, projectId }));
}

async function createEpic(data: CreateEpicInput): Promise<Epic> {
  const res = await fetch(`/api/projects/${data.projectId}/epics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: data.title, description: data.description }),
  });
  if (!res.ok) throw new Error('Failed to create epic');
  const json = await res.json();
  return { ...json.data, projectId: data.projectId, _count: { features: 0 } };
}

async function updateEpic({ id, data }: UpdateEpicInput): Promise<Epic> {
  const res = await fetch(`/api/epics/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update epic');
  const json = await res.json();
  return json.data;
}

async function deleteEpic(id: string): Promise<void> {
  const res = await fetch(`/api/epics/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete epic');
}

// ============ Hooks ============

/**
 * Fetch a single epic by ID
 */
export function useEpic(id: string) {
  return useQuery({
    queryKey: queryKeys.epics.detail(id),
    queryFn: () => fetchEpic(id),
    enabled: Boolean(id),
    ...CACHE_TIMES.STANDARD,
  });
}

/**
 * Fetch epics for a specific project
 */
export function useEpics(projectId: string) {
  return useQuery({
    queryKey: queryKeys.epics.list(projectId),
    queryFn: () => fetchEpics(projectId),
    enabled: Boolean(projectId),
    ...CACHE_TIMES.STANDARD,
  });
}

/**
 * Fetch all epics across all projects
 */
export function useAllEpics() {
  return useQuery({
    queryKey: queryKeys.epics.allList(),
    queryFn: fetchAllEpics,
    ...CACHE_TIMES.STANDARD,
  });
}

// ============ Mutations ============

/**
 * Create a new epic
 */
export function useCreateEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEpic,
    onSuccess: (newEpic, variables) => {
      // 1. Optimistic update: add to project list
      queryClient.setQueryData<Epic[]>(queryKeys.epics.list(variables.projectId), (old) => {
        if (!old) return [newEpic];
        return [...old, newEpic];
      });

      // 2. Optimistic update: add to all-list if cached
      queryClient.setQueryData<Epic[]>(queryKeys.epics.allList(), (old) => {
        if (!old) return old;
        return [...old, newEpic];
      });

      // 3. Invalidate specific queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.epics.list(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.epics.allList() });

      // 4. Invalidate project detail to update counters (e.g., epic count)
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.projectId) });

      toast.success('Epic criado');
    },
    onError: () => {
      toast.error('Erro ao criar epic');
    },
  });
}

/**
 * Update an epic
 */
export function useUpdateEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEpic,
    onSuccess: (updatedEpic, variables) => {
      // 1. Optimistic update: update the specific epic in cache
      queryClient.setQueryData<Epic>(queryKeys.epics.detail(variables.id), updatedEpic);

      // 2. Invalidate specific queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.epics.detail(variables.id) });

      // 3. Invalidate lists that contain this epic
      queryClient.invalidateQueries({ queryKey: queryKeys.epics.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.epics.allList() });

      // 4. Invalidate features of this epic (title change may affect UI)
      queryClient.invalidateQueries({ queryKey: queryKeys.features.list(updatedEpic.id) });

      // 5. Invalidate project detail if epic has projectId
      if (updatedEpic.projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(updatedEpic.projectId) });
      }

      toast.success('Epic atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar epic');
    },
  });
}

/**
 * Delete an epic
 */
export function useDeleteEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEpic,
    onSuccess: (_, deletedEpicId) => {
      // 1. Invalidate all epic queries (epic no longer exists)
      queryClient.invalidateQueries({ queryKey: queryKeys.epics.all });

      // 2. Remove from cache to avoid stale data
      queryClient.removeQueries({ queryKey: queryKeys.epics.detail(deletedEpicId) });
      queryClient.removeQueries({ queryKey: queryKeys.features.list(deletedEpicId) });

      toast.success('Epic excluído');
    },
    onError: () => {
      toast.error('Erro ao excluir epic');
    },
  });
}
