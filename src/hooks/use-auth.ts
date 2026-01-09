"use client";

import { useAuthContext } from "@/providers/auth-provider";
import type { UserProfile, AuthState } from "@/providers/auth-provider";

// Re-export types for backward compatibility
export type { UserProfile, AuthState };

/**
 * useAuth Hook
 * Now just a wrapper around the AuthContext to maintain API compatibility
 */
export function useAuth() {
  return useAuthContext();
}
