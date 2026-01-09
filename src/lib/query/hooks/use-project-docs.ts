/**
 * React Query Hooks for Project Docs
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '../query-keys';
import { CACHE_TIMES } from '../cache-config';

// Types
export interface ProjectDoc {
  id: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
}

interface CreateDocInput {
  projectId: string;
  title: string;
  content: string;
}

interface UpdateDocInput {
  id: string;
  title?: string;
  content?: string;
}

// API Functions
async function fetchProjectDocs(projectId: string): Promise<ProjectDoc[]> {
  const res = await fetch(`/api/projects/${projectId}/docs`);
  if (!res.ok) throw new Error('Failed to fetch docs');
  const json = await res.json();
  return json.data || [];
}

async function fetchDoc(id: string): Promise<ProjectDoc> {
  const res = await fetch(`/api/docs/${id}`);
  if (!res.ok) throw new Error('Failed to fetch doc');
  const json = await res.json();
  return json.data;
}

async function createDoc(input: CreateDocInput): Promise<ProjectDoc> {
  const res = await fetch(`/api/projects/${input.projectId}/docs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: input.title, content: input.content }),
  });
  if (!res.ok) throw new Error('Failed to create doc');
  const json = await res.json();
  return json.data;
}

async function updateDoc(input: UpdateDocInput): Promise<ProjectDoc> {
  const { id, ...data } = input;
  const res = await fetch(`/api/docs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update doc');
  const json = await res.json();
  return json.data;
}

async function deleteDoc(id: string): Promise<void> {
  const res = await fetch(`/api/docs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete doc');
}

// ============ Hooks ============

/**
 * Fetch all docs for a project
 */
export function useProjectDocs(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectDocs.list(projectId),
    queryFn: () => fetchProjectDocs(projectId),
    enabled: Boolean(projectId),
    ...CACHE_TIMES.STANDARD,
  });
}

/**
 * Fetch a single doc
 */
export function useDoc(id: string) {
  return useQuery({
    queryKey: queryKeys.projectDocs.detail(id),
    queryFn: () => fetchDoc(id),
    enabled: Boolean(id),
    ...CACHE_TIMES.STANDARD,
  });
}

/**
 * Create a new doc
 */
export function useCreateDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDoc,
    onSuccess: (newDoc, variables) => {
      // 1. Optimistic update: add to list immediately
      queryClient.setQueryData<ProjectDoc[]>(
        queryKeys.projectDocs.list(variables.projectId),
        (old) => {
          if (!old) return [newDoc];
          return [...old, newDoc];
        }
      );

      // 2. Invalidate for consistency with force refetch
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projectDocs.list(variables.projectId),
        refetchType: 'active'
      });
      toast.success('Documento criado');
    },
    onError: () => {
      toast.error('Erro ao criar documento');
    },
  });
}

/**
 * Update a doc
 */
export function useUpdateDoc(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDoc,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projectDocs.list(projectId),
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projectDocs.detail(data.id),
        refetchType: 'active'
      });
      toast.success('Documento atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar documento');
    },
  });
}

/**
 * Delete a doc
 */
export function useDeleteDoc(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDoc,
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projectDocs.list(projectId),
        refetchType: 'active'
      });
      toast.success('Documento excluído');
    },
    onError: () => {
      toast.error('Erro ao excluir documento');
    },
  });
}

