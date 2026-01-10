/**
 * React Query Hooks for Users
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { smartInvalidate } from '../helpers';
import { toast } from 'sonner';
import { queryKeys } from '../query-keys';
import { CACHE_TIMES } from '../cache-config';
import { useCurrentOrgId } from './use-org-id';

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
  const orgId = useCurrentOrgId();
  
  return useQuery({
    queryKey: queryKeys.users.list(orgId),
    queryFn: fetchUsers,
    enabled: orgId !== 'unknown',
    ...CACHE_TIMES.STABLE, // Users don't change often
  });
}

/**
 * Fetch current user profile
 * NOTE: This is global (not org-scoped) because it's the same user across orgs
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
  const orgId = useCurrentOrgId();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      // 1. Optimistic update: update current user immediately
      queryClient.setQueryData<User>(queryKeys.users.current(), updatedUser);

      // 2. Update in users list
      queryClient.setQueryData<User[]>(queryKeys.users.list(orgId), (old) => {
        if (!old) return old;
        return old.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      });

      // 3. Invalidate for consistency (UPDATE)
      smartInvalidate(queryClient, queryKeys.users.current());
      smartInvalidate(queryClient, queryKeys.users.list(orgId));
      toast.success('Perfil atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar perfil');
    },
  });
}

