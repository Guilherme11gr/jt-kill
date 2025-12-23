/**
 * React Query Hooks for Comments
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '../query-keys';
import { CACHE_TIMES } from '../cache-config';

// Types
export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface CreateCommentInput {
  taskId: string;
  content: string;
}

interface UpdateCommentInput {
  id: string;
  content: string;
}

// API Functions
async function fetchComments(taskId: string): Promise<Comment[]> {
  const res = await fetch(`/api/tasks/${taskId}/comments`);
  if (!res.ok) throw new Error('Failed to fetch comments');
  const json = await res.json();
  return json.data || [];
}

async function createComment(input: CreateCommentInput): Promise<Comment> {
  const res = await fetch(`/api/tasks/${input.taskId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: input.content }),
  });
  if (!res.ok) throw new Error('Failed to create comment');
  const json = await res.json();
  return json.data;
}

async function updateComment(input: UpdateCommentInput): Promise<Comment> {
  const res = await fetch(`/api/comments/${input.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: input.content }),
  });
  if (!res.ok) throw new Error('Failed to update comment');
  const json = await res.json();
  return json.data;
}

async function deleteComment(id: string): Promise<void> {
  const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete comment');
}

// ============ Hooks ============

/**
 * Fetch comments for a task
 */
export function useComments(taskId: string) {
  return useQuery({
    queryKey: queryKeys.comments.list(taskId),
    queryFn: () => fetchComments(taskId),
    enabled: Boolean(taskId),
    ...CACHE_TIMES.FRESH, // Comments should be fresh
  });
}

/**
 * Add a comment to a task
 */
/**
 * Add a comment to a task
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createComment,
    onSuccess: (newComment, variables) => {
      // 1. Update the list
      queryClient.setQueryData<Comment[]>(queryKeys.comments.list(variables.taskId), (old) => {
        if (!old) return [newComment];
        return [...old, newComment];
      });

      // 2. Invalidate
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.list(variables.taskId) });

      toast.success('Comentário adicionado');
    },
    onError: () => {
      toast.error('Erro ao adicionar comentário');
    },
  });
}

/**
 * Update a comment
 */
export function useUpdateComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.list(taskId) });
      toast.success('Comentário atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar comentário');
    },
  });
}

/**
 * Delete a comment
 */
export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.list(taskId) });
      toast.success('Comentário excluído');
    },
    onError: () => {
      toast.error('Erro ao excluir comentário');
    },
  });
}
