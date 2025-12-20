/**
 * React Query Hooks for Users
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '../query-keys';
import { CACHE_TIMES } from '../cache-config';

// Types
export interface User {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
}

// API Functions
async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error('Failed to fetch users');
  const json = await res.json();
  return json.data || [];
}

async function fetchCurrentUser(): Promise<User> {
  const res = await fetch('/api/users/me');
  if (!res.ok) throw new Error('Failed to fetch profile');
  const json = await res.json();
  return json.data;
}

async function updateProfile(data: UpdateProfileInput): Promise<User> {
  const res = await fetch('/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  const json = await res.json();
  return json.data;
}

// ============ Hooks ============

/**
 * Fetch all users in organization (for assignee dropdown)
 */
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: fetchUsers,
    ...CACHE_TIMES.STABLE, // Users don't change often
  });
}

/**
 * Fetch current user profile
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.users.current(),
    queryFn: fetchCurrentUser,
    ...CACHE_TIMES.STABLE,
  });
}

/**
 * Update current user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.current() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
      toast.success('Perfil atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar perfil');
    },
  });
}

