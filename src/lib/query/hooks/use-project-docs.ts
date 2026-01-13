/**
 * React Query Hooks for Project Docs
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { smartInvalidate, smartInvalidateImmediate } from '../helpers';
import { toast } from 'sonner';
import { queryKeys } from '../query-keys';
import { CACHE_TIMES } from '../cache-config';
import { useCurrentOrgId, isOrgIdValid } from './use-org-id';

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
  tagIds?: string[];
}

interface UpdateDocInput {
  id: string;
  title?: string;
  content?: string;
  tagIds?: string[];
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
    body: JSON.stringify({ 
      title: input.title, 
      content: input.content,
      tagIds: input.tagIds || []
    }),
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
    body: JSON.stringify({
      ...data,
      tagIds: data.tagIds || undefined
    }),
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
  const orgId = useCurrentOrgId();
  
  return useQuery({
    queryKey: queryKeys.projectDocs.list(orgId, projectId),
    queryFn: () => fetchProjectDocs(projectId),
    enabled: Boolean(projectId) && isOrgIdValid(orgId),
    ...CACHE_TIMES.STANDARD,
  });
}

/**
 * Fetch a single doc
 */
export function useDoc(id: string) {
  const orgId = useCurrentOrgId();
  
  return useQuery({
    queryKey: queryKeys.projectDocs.detail(orgId, id),
    queryFn: () => fetchDoc(id),
    enabled: Boolean(id) && isOrgIdValid(orgId),
    ...CACHE_TIMES.STANDARD,
  });
}

/**
 * Create a new doc
 */
export function useCreateDoc() {
  const queryClient = useQueryClient();
  const orgId = useCurrentOrgId();

  return useMutation({
    mutationFn: createDoc,
    onSuccess: (newDoc, variables) => {
      // 1. Optimistic update: add to list immediately
      queryClient.setQueryData<ProjectDoc[]>(
        queryKeys.projectDocs.list(orgId, variables.projectId),
        (old) => {
          if (!old) return [newDoc];
          return [...old, newDoc];
        }
      );

      // 2. Invalidate for consistency (CREATE = critical)
      smartInvalidateImmediate(queryClient, queryKeys.projectDocs.list(orgId, variables.projectId));
      // 3. Invalidate tags to update usage counts
      smartInvalidate(queryClient, queryKeys.docTags.list(orgId, variables.projectId));
      toast.success('Documento criado');
    },
    onError: () => {
      toast.error('Erro ao criar documento');
    },
  });
}

/**
 * Update a doc with optimistic update for instant UX
 */
export function useUpdateDoc(projectId: string) {
  const queryClient = useQueryClient();
  const orgId = useCurrentOrgId();

  return useMutation({
    mutationFn: updateDoc,
    onMutate: async (input) => {
      // 1. Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.projectDocs.list(orgId, projectId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.projectDocs.detail(orgId, input.id) });

      // 2. Snapshot previous values for rollback
      const previousList = queryClient.getQueryData<ProjectDoc[]>(
        queryKeys.projectDocs.list(orgId, projectId)
      );
      const previousDetail = queryClient.getQueryData<ProjectDoc>(
        queryKeys.projectDocs.detail(orgId, input.id)
      );

      // 3. Optimistically update list cache
      queryClient.setQueryData<ProjectDoc[]>(
        queryKeys.projectDocs.list(orgId, projectId),
        (old) => old?.map(doc => 
          doc.id === input.id 
            ? { ...doc, ...input, updatedAt: new Date().toISOString() } 
            : doc
        )
      );

      // 4. Optimistically update detail cache
      queryClient.setQueryData<ProjectDoc>(
        queryKeys.projectDocs.detail(orgId, input.id),
        (old) => old ? { ...old, ...input, updatedAt: new Date().toISOString() } : old
      );

      return { previousList, previousDetail };
    },
    onSuccess: (data) => {
      // Replace optimistic data with real server data
      queryClient.setQueryData<ProjectDoc>(
        queryKeys.projectDocs.detail(orgId, data.id),
        data
      );
      smartInvalidate(queryClient, queryKeys.projectDocs.list(orgId, projectId));
      // Invalidate tags to update usage counts
      smartInvalidate(queryClient, queryKeys.docTags.list(orgId, projectId));
      toast.success('Documento atualizado');
    },
    onError: (_, input, context) => {
      // Rollback to previous values
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.projectDocs.list(orgId, projectId),
          context.previousList
        );
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(
          queryKeys.projectDocs.detail(orgId, input.id),
          context.previousDetail
        );
      }
      toast.error('Erro ao atualizar documento');
    },
  });
}

/**
 * Delete a doc with optimistic update for instant removal from UI
 */
export function useDeleteDoc(projectId: string) {
  const queryClient = useQueryClient();
  const orgId = useCurrentOrgId();

  return useMutation({
    mutationFn: deleteDoc,
    onMutate: async (docId) => {
      // 1. Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.projectDocs.list(orgId, projectId) });

      // 2. Snapshot previous value for rollback
      const previousList = queryClient.getQueryData<ProjectDoc[]>(
        queryKeys.projectDocs.list(orgId, projectId)
      );

      // 3. Optimistically remove from list immediately
      queryClient.setQueryData<ProjectDoc[]>(
        queryKeys.projectDocs.list(orgId, projectId),
        (old) => old?.filter(doc => doc.id !== docId)
      );

      // 4. Remove detail cache
      queryClient.removeQueries({ queryKey: queryKeys.projectDocs.detail(orgId, docId) });

      return { previousList, deletedId: docId };
    },
    onSuccess: () => {
      // No need to invalidate - optimistic update already done
      toast.success('Documento excluído');
    },
    onError: (_, __, context) => {
      // Rollback to previous list
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.projectDocs.list(orgId, projectId),
          context.previousList
        );
      }
      toast.error('Erro ao excluir documento');
    },
  });
}
