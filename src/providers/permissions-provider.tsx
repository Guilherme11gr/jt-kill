'use client';

import { createContext, useContext, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { hasPermission, Permission, UserRole } from '@/config/permissions';

interface PermissionsContextType {
  can: (permission: Permission) => boolean;
  role: UserRole | null;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const role = profile?.role as UserRole | undefined;

  const can = useCallback((permission: Permission) => {
    if (!role) return false;
    return hasPermission(role, permission);
  }, [role]);

  return (
    <PermissionsContext.Provider value={{ can, role: role ?? null }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}
