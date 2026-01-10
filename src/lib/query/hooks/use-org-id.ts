/**
 * Hook para obter o orgId atual de forma segura para query keys
 * 
 * IMPORTANTE: Este hook é usado internamente pelos outros hooks de query
 * para garantir isolamento de cache entre organizações.
 * 
 * @returns orgId string ou 'unknown' se não estiver disponível
 */

import { useAuthContext } from '@/providers/auth-provider';

/**
 * Retorna o orgId atual para uso em query keys.
 * 
 * Retorna 'unknown' se:
 * - Usuário não está autenticado
 * - Profile ainda não carregou
 * - currentOrgId não está definido
 * 
 * NOTA: 'unknown' como orgId garante que queries feitas antes do auth
 * completar não "poluam" o cache de uma org específica.
 */
export function useCurrentOrgId(): string {
  const { profile } = useAuthContext();
  return profile?.currentOrgId ?? 'unknown';
}
