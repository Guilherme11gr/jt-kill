export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type Permission =
  | 'project:create'
  | 'project:delete'
  | 'project:update'
  | 'task:create'
  | 'task:delete'
  | 'task:update'
  | 'team:manage'
  | 'settings:manage';

const ROLES: Record<UserRole, Permission[]> = {
  OWNER: [
    'project:create',
    'project:delete',
    'project:update',
    'task:create',
    'task:delete',
    'task:update',
    'team:manage',
    'settings:manage',
  ],
  ADMIN: [
    'project:create',
    'project:update',
    'task:create',
    'task:delete',
    'task:update',
    'team:manage',
  ],
  MEMBER: [
    'task:create',
    'task:update',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLES[role]?.includes(permission) ?? false;
}
