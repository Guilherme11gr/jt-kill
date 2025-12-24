/**
 * React Query Hooks for Doc Tags
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '../query-keys';
import { CACHE_TIMES } from '../cache-config';

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
    return useQuery({
        queryKey: queryKeys.docTags.list(projectId),
        queryFn: () => fetchProjectTags(projectId),
        enabled: Boolean(projectId),
        ...CACHE_TIMES.STANDARD,
    });
}

/**
 * Fetch tags for a specific document
 */
export function useDocTags(docId: string) {
    return useQuery({
        queryKey: queryKeys.docTags.forDoc(docId),
        queryFn: () => fetchDocTags(docId),
        enabled: Boolean(docId),
        ...CACHE_TIMES.STANDARD,
    });
}

/**
 * Create a new tag for a project
 */
export function useCreateTag(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createTag,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.docTags.list(projectId) });
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

    return useMutation({
        mutationFn: deleteTag,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.docTags.list(projectId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.docTags.all });
            toast.success('Tag excluída');
        },
        onError: () => {
            toast.error('Erro ao excluir tag');
        },
    });
}

/**
 * Assign tags to a document
 */
export function useAssignTags(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: assignTags,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.docTags.forDoc(variables.docId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.docTags.list(projectId) });
            toast.success('Tag adicionada');
        },
        onError: () => {
            toast.error('Erro ao adicionar tag');
        },
    });
}

/**
 * Remove a tag from a document
 */
export function useUnassignTag(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: unassignTag,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.docTags.forDoc(variables.docId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.docTags.list(projectId) });
            toast.success('Tag removida');
        },
        onError: () => {
            toast.error('Erro ao remover tag');
        },
    });
}
