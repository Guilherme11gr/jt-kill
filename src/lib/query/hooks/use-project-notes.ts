/**
 * React Query Hooks for Project Notes (Ideas)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '../query-keys';
import { CACHE_TIMES } from '../cache-config';

// Types
export type NoteStatus = 'ACTIVE' | 'ARCHIVED' | 'CONVERTED';

export interface ProjectNote {
  id: string;
  projectId: string;
  title: string;
  content: string;
  status: NoteStatus;
  convertedToFeatureId?: string | null;
  createdAt: string;
  updatedAt: string;
  convertedToFeature?: {
    id: string;
    title: string;
  } | null;
}

interface CreateNoteInput {
  projectId: string;
  title: string;
  content: string;
}

interface UpdateNoteInput {
  id: string;
  title?: string;
  content?: string;
}

interface ConvertNoteInput {
  noteId: string;
  epicId: string;
}

interface ConvertNoteResult {
  note: ProjectNote;
  feature: {
    id: string;
    title: string;
  };
}

// API Functions
async function fetchProjectNotes(projectId: string, status?: NoteStatus): Promise<ProjectNote[]> {
  const url = status
    ? `/api/projects/${projectId}/notes?status=${status}`
    : `/api/projects/${projectId}/notes`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch notes');
  const json = await res.json();
  return json.data || [];
}

async function fetchNote(id: string): Promise<ProjectNote> {
  const res = await fetch(`/api/notes/${id}`);
  if (!res.ok) throw new Error('Failed to fetch note');
  const json = await res.json();
  return json.data;
}

async function createNote(input: CreateNoteInput): Promise<ProjectNote> {
  const res = await fetch(`/api/projects/${input.projectId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: input.title, content: input.content }),
  });
  if (!res.ok) throw new Error('Failed to create note');
  const json = await res.json();
  return json.data;
}

async function updateNote(input: UpdateNoteInput): Promise<ProjectNote> {
  const { id, ...data } = input;
  const res = await fetch(`/api/notes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update note');
  const json = await res.json();
  return json.data;
}

async function deleteNote(id: string): Promise<void> {
  const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete note');
}

async function archiveNote(id: string, unarchive = false): Promise<ProjectNote> {
  const res = await fetch(`/api/notes/${id}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unarchive }),
  });
  if (!res.ok) throw new Error('Failed to archive note');
  const json = await res.json();
  return json.data;
}

async function convertNote(input: ConvertNoteInput): Promise<ConvertNoteResult> {
  const res = await fetch(`/api/notes/${input.noteId}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ epicId: input.epicId }),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error?.message || 'Failed to convert note');
  }
  const json = await res.json();
  return json.data;
}

// ============ Hooks ============

/**
 * Fetch all notes for a project
 */
export function useProjectNotes(projectId: string, status?: NoteStatus) {
  return useQuery({
    queryKey: queryKeys.projectNotes.list(projectId, status),
    queryFn: () => fetchProjectNotes(projectId, status),
    enabled: Boolean(projectId),
    ...CACHE_TIMES.STANDARD,
  });
}

/**
 * Fetch a single note
 */
export function useNote(id: string) {
  return useQuery({
    queryKey: queryKeys.projectNotes.detail(id),
    queryFn: () => fetchNote(id),
    enabled: Boolean(id),
    ...CACHE_TIMES.STANDARD,
  });
}

/**
 * Create a new note
 */
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNote,
    onSuccess: (newNote, variables) => {
      // Optimistic update: add to list immediately
      queryClient.setQueryData<ProjectNote[]>(
        queryKeys.projectNotes.list(variables.projectId),
        (old) => {
          if (!old) return [newNote];
          return [newNote, ...old];
        }
      );

      // Invalidate for consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.projectNotes.lists() });
      toast.success('Ideia criada');
    },
    onError: () => {
      toast.error('Erro ao criar ideia');
    },
  });
}

/**
 * Update a note
 */
export function useUpdateNote(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNote,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectNotes.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectNotes.detail(data.id) });
      toast.success('Ideia atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar ideia');
    },
  });
}

/**
 * Delete a note
 */
export function useDeleteNote(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectNotes.lists() });
      toast.success('Ideia excluída');
    },
    onError: () => {
      toast.error('Erro ao excluir ideia');
    },
  });
}
/**
 * Archive or unarchive a note
 */
export function useArchiveNote(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, unarchive = false }: { id: string; unarchive?: boolean }) =>
      archiveNote(id, unarchive),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.projectNotes.list(projectId) });

      // Snapshot previous value
      const previousNotes = queryClient.getQueryData<ProjectNote[]>(
        queryKeys.projectNotes.list(projectId)
      );

      // Optimistic update
      if (previousNotes) {
        queryClient.setQueryData<ProjectNote[]>(
          queryKeys.projectNotes.list(projectId),
          previousNotes.map(note =>
            note.id === variables.id
              ? { ...note, status: variables.unarchive ? 'ACTIVE' as const : 'ARCHIVED' as const }
              : note
          )
        );
      }

      return { previousNotes };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(
          queryKeys.projectNotes.list(projectId),
          context.previousNotes
        );
      }
      toast.error('Erro ao arquivar ideia');
    },
    onSuccess: (data, variables) => {
      toast.success(variables.unarchive ? 'Ideia restaurada' : 'Ideia arquivada');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.projectNotes.lists() });
    },
  });
}

/**
 * Convert a note to a feature
 */
export function useConvertNote(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: convertNote,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectNotes.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.features.all });
      toast.success(`Ideia convertida em Feature "${data.feature.title}"`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao converter ideia');
    },
  });
}
