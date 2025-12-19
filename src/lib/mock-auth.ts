// Mock auth helper para desenvolvimento
// TODO: Substituir por Supabase Auth real

import { cookies } from 'next/headers';

export interface MockAuthContext {
  userId: string;
  tenantId: string;
}

export async function getMockAuthContext(): Promise<MockAuthContext> {
  // Para MVP, retorna org/user fixo
  // Em produção, substituir por extractAuthenticatedTenant do Supabase
  return {
    userId: '00000000-0000-0000-0000-000000000001',
    tenantId: '00000000-0000-0000-0000-000000000001',
  };
}
