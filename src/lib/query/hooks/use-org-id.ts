'use client';

/**
 * Hook para obter o orgId atual de forma segura para query keys
 * 
 * IMPORTANTE: Este hook é usado internamente pelos outros hooks de query
 * para garantir isolamento de cache entre organizações.
 * 
 * @returns orgId string ou 'unknown' se não estiver disponível
 */

import { useAuthContext } from '@/providers/auth-provider';
import { useEffect, useRef } from 'react';

/**
 * Retorna o orgId atual para uso em query keys.
 * 
 * Retorna 'unknown' se:
 * - Usuário não está autenticado
 * - Profile ainda não carregou
 * - currentOrgId não está definido
 * 
 * Retorna 'switching' se:
 * - Org switch está em andamento
 * 
 * NOTA: 'unknown'/'switching' como orgId garante que queries feitas antes do auth
 * completar não "poluam" o cache de uma org específica.
 */
export function useCurrentOrgId(): string {
  const { profile, isSwitchingOrg } = useAuthContext();
  const previousOrgId = useRef<string | null>(null);
  const orgId = profile?.currentOrgId ?? 'unknown';
  
  // Log org changes for debugging multi-tenant issues
  useEffect(() => {
    if (previousOrgId.current !== null && previousOrgId.current !== orgId) {
      console.log('[useCurrentOrgId] Org changed:', {
        from: previousOrgId.current,
        to: orgId,
        isSwitchingOrg,
        timestamp: new Date().toISOString(),
      });
    }
    previousOrgId.current = orgId;
  }, [orgId, isSwitchingOrg]);

  // If org is switching, return 'switching' to prevent queries with stale orgId
  if (isSwitchingOrg) {
    console.log('[useCurrentOrgId] Org is switching, returning "switching"');
    return 'switching';
  }
  
  return orgId;
}

/**
 * Check if orgId is valid for queries.
 * 
 * @example
 * enabled: isOrgIdValid(orgId) && Boolean(taskId)
 */
export function isOrgIdValid(orgId: string): boolean {
  return orgId !== 'unknown' && orgId !== 'switching';
}
