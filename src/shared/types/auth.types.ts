import type { User } from '@supabase/supabase-js';

// User roles in organization
export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER';

// Organization membership info
export interface OrgMembershipInfo {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: UserRole;
  isDefault: boolean;
}

// Authenticated context extracted from session
export interface AuthenticatedTenant {
  userId: string;
  tenantId: string; // current org_id
  memberships: OrgMembershipInfo[]; // all user's orgs
}

// User profile with organization info
export interface UserProfile {
  id: string;
  orgId: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Extended user with profile
export interface AuthenticatedUser extends User {
  profile: UserProfile;
}

// Session check result
export type SessionResult =
  | { authenticated: true; user: AuthenticatedUser }
  | { authenticated: false; user: null };
