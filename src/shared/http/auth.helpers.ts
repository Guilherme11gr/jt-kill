import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthenticatedTenant } from '@/shared/types';
import { UnauthorizedError, ForbiddenError } from '@/shared/errors';

// Mock para desenvolvimento - TODO: Remover antes de produção
const DEV_MOCK_AUTH = process.env.DEV_MOCK_AUTH === 'true';
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';
const MOCK_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Extract authenticated user and tenant from Supabase session.
 * Use this in ALL protected API routes.
 * 
 * @throws UnauthorizedError if not authenticated
 * @throws ForbiddenError if user has no organization
 */
export async function extractAuthenticatedTenant(
  supabase: SupabaseClient
): Promise<AuthenticatedTenant> {
  // DEV: Mock auth bypass para testes locais
  if (DEV_MOCK_AUTH) {
    console.warn('[DEV] Using mock auth - DO NOT USE IN PRODUCTION');
    return {
      userId: MOCK_USER_ID,
      tenantId: MOCK_TENANT_ID,
    };
  }

  // 1. Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError('Sessão inválida ou expirada');
  }

  // 2. Get user profile with org_id
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new ForbiddenError('Usuário não vinculado a uma organização');
  }

  return {
    userId: user.id,
    tenantId: profile.org_id,
  };
}

/**
 * Check if user has required role.
 * 
 * @throws ForbiddenError if user doesn't have required role
 */
export async function requireRole(
  supabase: SupabaseClient,
  userId: string,
  allowedRoles: Array<'OWNER' | 'ADMIN' | 'MEMBER'>
): Promise<void> {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new ForbiddenError('Perfil não encontrado');
  }

  if (!allowedRoles.includes(profile.role)) {
    throw new ForbiddenError('Permissão insuficiente para esta ação');
  }
}

/**
 * Extract user ID from Supabase session.
 * Simpler than extractAuthenticatedTenant when you only need the user ID.
 * 
 * @throws UnauthorizedError if not authenticated
 */
export async function extractUserId(supabase: SupabaseClient): Promise<string> {
  // DEV: Mock auth bypass para testes locais
  if (DEV_MOCK_AUTH) {
    return MOCK_USER_ID;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError('Sessão inválida ou expirada');
  }

  return user.id;
}

