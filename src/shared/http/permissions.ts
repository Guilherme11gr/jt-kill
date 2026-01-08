/**
 * Permissions Helper - Centralized access control
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ForbiddenError } from '@/shared/errors';

// Role type
type Role = 'OWNER' | 'ADMIN' | 'MEMBER';

// Action permission mapping
const PERMISSIONS: Record<string, Role[]> = {
  // Organization management
  'org.update': ['OWNER'],
  'org.delete': ['OWNER'],

  // User management
  'user.invite': ['OWNER', 'ADMIN'],
  'user.remove': ['OWNER', 'ADMIN'], // Note: ADMIN can only remove MEMBER
  'user.role.change': ['OWNER'],

  // Project management
  'project.create': ['OWNER', 'ADMIN'],
  'project.delete': ['OWNER', 'ADMIN'],
  'project.update': ['OWNER', 'ADMIN'],

  // Epic/Feature/Task - all roles can manage
  'epic.create': ['OWNER', 'ADMIN', 'MEMBER'],
  'epic.update': ['OWNER', 'ADMIN', 'MEMBER'],
  'epic.delete': ['OWNER', 'ADMIN'],

  'feature.create': ['OWNER', 'ADMIN', 'MEMBER'],
  'feature.update': ['OWNER', 'ADMIN', 'MEMBER'],
  'feature.delete': ['OWNER', 'ADMIN'],

  'task.create': ['OWNER', 'ADMIN', 'MEMBER'],
  'task.update': ['OWNER', 'ADMIN', 'MEMBER'],
  'task.delete': ['OWNER', 'ADMIN', 'MEMBER'],

  // View actions - all roles can view
  'view.all': ['OWNER', 'ADMIN', 'MEMBER'],
};

/**
 * Check if a role has permission for an action
 */
export function hasPermission(role: Role, action: string): boolean {
  const allowedRoles = PERMISSIONS[action];
  if (!allowedRoles) {
    // Default: deny if action not defined
    return false;
  }
  return allowedRoles.includes(role);
}

/**
 * Get user's role from profile
 */
async function getUserRole(supabase: SupabaseClient, userId: string): Promise<Role> {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new ForbiddenError('Perfil não encontrado');
  }

  return profile.role as Role;
}

/**
 * Require permission for an action
 * @throws ForbiddenError if user doesn't have permission
 */
export async function requirePermission(
  supabase: SupabaseClient,
  userId: string,
  action: string
): Promise<void> {
  const role = await getUserRole(supabase, userId);

  if (!hasPermission(role, action)) {
    throw new ForbiddenError(`Você não tem permissão para: ${action}`);
  }
}

/**
 * Check multiple permissions at once
 */
export async function checkPermissions(
  supabase: SupabaseClient,
  userId: string,
  actions: string[]
): Promise<Record<string, boolean>> {
  const role = await getUserRole(supabase, userId);

  return actions.reduce((acc, action) => {
    acc[action] = hasPermission(role, action);
    return acc;
  }, {} as Record<string, boolean>);
}

// Export permission constants for type safety
export const ACTIONS = {
  ORG_UPDATE: 'org.update',
  ORG_DELETE: 'org.delete',
  USER_INVITE: 'user.invite',
  USER_REMOVE: 'user.remove',
  USER_ROLE_CHANGE: 'user.role.change',
  PROJECT_CREATE: 'project.create',
  PROJECT_DELETE: 'project.delete',
  PROJECT_UPDATE: 'project.update',
  EPIC_CREATE: 'epic.create',
  EPIC_UPDATE: 'epic.update',
  EPIC_DELETE: 'epic.delete',
  FEATURE_CREATE: 'feature.create',
  FEATURE_UPDATE: 'feature.update',
  FEATURE_DELETE: 'feature.delete',
  TASK_CREATE: 'task.create',
  TASK_UPDATE: 'task.update',
  TASK_DELETE: 'task.delete',
  VIEW_ALL: 'view.all',
} as const;

export type Action = typeof ACTIONS[keyof typeof ACTIONS];
