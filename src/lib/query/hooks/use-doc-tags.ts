/**
 * React Query Hooks for Doc Tags
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '../query-keys';
import { CACHE_TIMES } from '../cache-config';
import { useCurrentOrgId } from './use-org-id';

// Types
export interface DocTag {
    id: string;
    name: string;
    projectId: string;
    orgId: string;
    createdAt: string;
    _count?: {
        assignments: number;
    };
}

interface CreateTagInput {
    projectId: string;
    name: string;
}

interface AssignTagsInput {
    docId: string;
    tagIds: string[];
}

interface UnassignTagInput {
    docId: string;
    tagId: string;
}

// API Functions
async function fetchProjectTags(projectId: string): Promise<DocTag[]> {
    const res = await fetch(`/api/projects/${projectId}/tags`);
    if (!res.ok) throw new Error('Failed to fetch tags');
    const json = await res.json();
    return json.data || [];
}

async function fetchDocTags(docId: string): Promise<DocTag[]> {
    const res = await fetch(`/api/docs/${docId}/tags`);
    if (!res.ok) throw new Error('Failed to fetch doc tags');
    const json = await res.json();
    return json.data || [];
}

async function createTag(input: CreateTagInput): Promise<DocTag> {
    const res = await fetch(`/api/projects/${input.projectId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: input.name }),
    });
    if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to create tag');
    }
    const json = await res.json();
    return json.data;
}

async function deleteTag(tagId: string): Promise<void> {
    const res = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete tag');
}

async function assignTags(input: AssignTagsInput): Promise<DocTag[]> {
    const res = await fetch(`/api/docs/${input.docId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: input.tagIds }),
    });
    if (!res.ok) throw new Error('Failed to assign tags');
    const json = await res.json();
    return json.data || [];
}

async function unassignTag(input: UnassignTagInput): Promise<DocTag[]> {
    const res = await fetch(`/api/docs/${input.docId}/tags/${input.tagId}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to remove tag');
    const json = await res.json();
    return json.data || [];
}

// ============ Hooks ============

/**
 * Fetch all tags for a project
 */
export function useProjectTags(projectId: string) {
    const orgId = useCurrentOrgId();
    
    return useQuery({
        queryKey: queryKeys.docTags.list(orgId, projectId),
        queryFn: () => fetchProjectTags(projectId),
        enabled: Boolean(projectId) && orgId !== 'unknown',
        ...CACHE_TIMES.STANDARD,
    });
}

/**
 * Fetch tags for a specific document
 */
export function useDocTags(docId: string) {
    const orgId = useCurrentOrgId();
    
    return useQuery({
        queryKey: queryKeys.docTags.forDoc(orgId, docId),
        queryFn: () => fetchDocTags(docId),
        enabled: Boolean(docId) && orgId !== 'unknown',
        ...CACHE_TIMES.STANDARD,
    });
}

/**
 * Create a new tag for a project
 */
export function useCreateTag(projectId: string) {
    const queryClient = useQueryClient();
    const orgId = useCurrentOrgId();

    return useMutation({
        mutationFn: createTag,
        onSuccess: (newTag) => {
            // 1. Optimistic update: add to list immediately
            queryClient.setQueryData<DocTag[]>(
                queryKeys.docTags.list(orgId, projectId),
                (old) => {
                    if (!old) return [newTag];
                    return [...old, newTag];
                }
            );

            // 2. Invalidate for consistency with force refetch
            queryClient.invalidateQueries({ 
                queryKey: queryKeys.docTags.list(orgId, projectId),
                refetchType: 'active'
            });
            toast.success('Tag criada');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao criar tag');
        },
    });
}

/**
 * Delete a tag
 */
export function useDeleteTag(projectId: string) {
    const queryClient = useQueryClient();
    const orgId = useCurrentOrgId();

    return useMutation({
        mutationFn: deleteTag,
        onMutate: async (deletedId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.docTags.list(orgId, projectId) });

            // Snapshot previous value
            const previousTags = queryClient.getQueryData<DocTag[]>(
                queryKeys.docTags.list(orgId, projectId)
            );

            // Optimistically remove
            if (previousTags) {
                queryClient.setQueryData<DocTag[]>(
                    queryKeys.docTags.list(orgId, projectId),
                    previousTags.filter((t) => t.id !== deletedId)
                );
            }

            return { previousTags };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ 
                queryKey: queryKeys.docTags.list(orgId, projectId),
                refetchType: 'active'
            });
            queryClient.invalidateQueries({ 
                queryKey: queryKeys.docTags.all(orgId),
                refetchType: 'active'
            });
            toast.success('Tag excluída');
        },
        onError: (_, __, context) => {
            // Rollback on error
            if (context?.previousTags) {
                queryClient.setQueryData(
                    queryKeys.docTags.list(orgId, projectId),
                    context.previousTags
                );
            }
            toast.error('Erro ao excluir tag');
        },
    });
}

/**
 * Assign tags to a document
 */
export function useAssignTags(projectId: string) {
    const queryClient = useQueryClient();
    const orgId = useCurrentOrgId();

    return useMutation({
        mutationFn: assignTags,
        onMutate: async (variables) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.docTags.forDoc(orgId, variables.docId) });

            // Return context for rollback
            const previousTags = queryClient.getQueryData<DocTag[]>(queryKeys.docTags.forDoc(orgId, variables.docId));
            return { previousTags };
        },
        onSuccess: (newTags, variables) => {
            // Update cache with server response
            queryClient.setQueryData(queryKeys.docTags.forDoc(orgId, variables.docId), newTags);
            queryClient.invalidateQueries({ 
                queryKey: queryKeys.docTags.list(orgId, projectId),
                refetchType: 'active'
            });
            toast.success('Tag adicionada');
        },
        onError: (_, variables, context) => {
            // Rollback on error
            if (context?.previousTags) {
                queryClient.setQueryData(queryKeys.docTags.forDoc(orgId, variables.docId), context.previousTags);
            }
            toast.error('Erro ao adicionar tag');
        },
    });
}

/**
 * Remove a tag from a document
 */
export function useUnassignTag(projectId: string) {
    const queryClient = useQueryClient();
    const orgId = useCurrentOrgId();

    return useMutation({
        mutationFn: unassignTag,
        onMutate: async (variables) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.docTags.forDoc(orgId, variables.docId) });

            // Optimistically remove the tag
            const previousTags = queryClient.getQueryData<DocTag[]>(queryKeys.docTags.forDoc(orgId, variables.docId));
            if (previousTags) {
                queryClient.setQueryData(
                    queryKeys.docTags.forDoc(orgId, variables.docId),
                    previousTags.filter((t) => t.id !== variables.tagId)
                );
            }
            return { previousTags };
        },
        onSuccess: (newTags, variables) => {
            // Update cache with server response
            queryClient.setQueryData(queryKeys.docTags.forDoc(orgId, variables.docId), newTags);
            queryClient.invalidateQueries({ 
                queryKey: queryKeys.docTags.list(orgId, projectId),
                refetchType: 'active'
            });
            toast.success('Tag removida');
        },
        onError: (_, variables, context) => {
            // Rollback on error
            if (context?.previousTags) {
                queryClient.setQueryData(queryKeys.docTags.forDoc(orgId, variables.docId), context.previousTags);
            }
            toast.error('Erro ao remover tag');
        },
    });
}
