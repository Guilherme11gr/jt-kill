/**
 * User Types - Additional types not in auth.types
 */

// Re-export from auth.types for convenience
export type { UserRole, UserProfile } from './auth.types';

// Simplified user for lists/dropdowns
export interface UserSummary {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

// Input for profile updates
export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
}
