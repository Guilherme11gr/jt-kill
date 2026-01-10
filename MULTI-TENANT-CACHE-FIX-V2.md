# Fix Multi-Tenant Cache Isolation (V2 - Deep Analysis)

## Problema Identificado

**Sintomas:** Dados de Org Y aparecem quando visualizando Org X.

**Causa Raiz:** Race condition entre cookie do backend e `profile.currentOrgId` do frontend.

### Cenário da Falha

```
1. Frontend: profile.currentOrgId = X (React state)
2. Backend: cookie jt-current-org = Y (http-only)
3. Query é feita: GET /api/projects
4. Backend lê cookie (Y) → retorna projetos de Y
5. Frontend usa profile.currentOrgId (X) → armazena em key de X
6. Resultado: Dados de Y ficam na key de X
```

### Como Isso Acontece

1. **Múltiplas tabs:** Usuário troca org em outra aba
2. **Cookie compartilhado:** Cookie `jt-current-org` é compartilhado entre tabs
3. **State local:** `profile.currentOrgId` no React state de cada tab é independente
4. **Divergência:** Tab A ainda acha que está em Org X, mas cookie já mudou para Y

## Correções Implementadas

### 1. `useCurrentOrgId()` - Proteção Durante Switch

```typescript
// src/lib/query/hooks/use-org-id.ts

export function useCurrentOrgId(): string {
  const { profile, isSwitchingOrg } = useAuthContext();
  
  // NOVO: Bloqueia queries durante switch
  if (isSwitchingOrg) {
    return 'switching';
  }
  
  return profile?.currentOrgId ?? 'unknown';
}

// Helper para validação
export function isOrgIdValid(orgId: string): boolean {
  return orgId !== 'unknown' && orgId !== 'switching';
}
```

**Impacto:** Queries ficam desabilitadas durante org switch, evitando race condition.

### 2. Todas as Queries Atualizadas

```typescript
// Antes
enabled: orgId !== 'unknown'

// Depois
enabled: isOrgIdValid(orgId)  // Bloqueia 'unknown' E 'switching'
```

**Arquivos atualizados:**
- `use-projects.ts`
- `use-tasks.ts`
- `use-features.ts`
- `use-epics.ts`
- `use-dashboard.ts`
- `use-comments.ts`
- `use-users.ts`
- `use-doc-tags.ts`
- `use-project-docs.ts`
- `use-project-notes.ts`

### 3. Logging para Debug

Adicionado logging em pontos críticos:

```typescript
// AuthProvider - fetchProfile
console.log('[AuthProvider] Profile fetched:', { currentOrgId, ... });

// QueryClient - getQueryClient
console.log('[QueryClient] Creating new QueryClient instance');
console.log('[QueryClient] Org switch pending detected, destroying old client');

// useCurrentOrgId
console.log('[useCurrentOrgId] Org changed:', { from, to, ... });
```

### 4. Cache Headers Forçados

```typescript
// fetchProfile agora força no-cache
const response = await fetch(`/api/users/me`, {
  cache: 'no-store',
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
  },
});
```

## Como Testar

### 1. Teste Básico (Uma Tab)
1. Login em Org X
2. Ver dashboard (deve mostrar dados de X)
3. Trocar para Org Y via switcher
4. Ver dashboard (deve mostrar dados de Y)

### 2. Teste Multi-Tab (Cenário Crítico)
1. Abrir 2 tabs no dashboard
2. Tab 1: Org X
3. Tab 2: Trocar para Org Y
4. Tab 1: Navegar ou fazer refresh manual
5. **Expectativa:** Tab 1 deve detectar divergência e recarregar

### 3. Logs para Observar

**Console do Browser:**
```
[AuthProvider] Profile fetched: { currentOrgId: "xxx" }
[useCurrentOrgId] Org changed: { from: "yyy", to: "xxx" }
[QueryClient] Creating new QueryClient instance
```

**Se ver queries falhando:**
```
[useCurrentOrgId] Org is switching, returning "switching"
```
Isso é esperado - queries ficam desabilitadas temporariamente.

## Limitações Conhecidas

### Problema: Cookie vs React State

O cookie `jt-current-org` é **httpOnly** e compartilhado entre tabs, mas o `profile.currentOrgId` é React state local.

**Cenários não cobertos:**
1. Usuário muda org em outra tab
2. Tab atual não detecta mudança
3. Tab atual continua fazendo queries com orgId stale

**Solução futura:** Implementar uma das alternativas abaixo.

## Próximos Passos (Recomendações)

### Opção 1: Backend Retorna OrgId (Recomendado)

Modificar TODAS as respostas de API para incluir `_meta.orgId`:

```typescript
// shared/http/responses.ts
export function jsonSuccess<T>(data: T, orgId?: string) {
  return NextResponse.json({
    data,
    _meta: { orgId }  // Sempre incluir orgId
  });
}

// Client-side validation
async function safeFetch(url: string, expectedOrgId: string) {
  const res = await fetch(url);
  const json = await res.json();
  
  if (json._meta?.orgId !== expectedOrgId) {
    // Divergência detectada! Forçar refresh
    window.location.reload();
  }
  
  return json.data;
}
```

**Vantagens:**
- Detecta divergência ANTES de armazenar no cache
- Funciona para múltiplas tabs
- Não depende de polling

**Desvantagens:**
- Requer modificar TODAS as APIs (50+ endpoints)
- Breaking change

### Opção 2: Polling do Profile

Fazer polling periódico do profile para detectar mudanças:

```typescript
// AuthProvider
useEffect(() => {
  if (!profile) return;
  
  const interval = setInterval(async () => {
    const freshProfile = await fetchProfile();
    
    if (freshProfile?.currentOrgId !== profile.currentOrgId) {
      console.warn('[AuthProvider] Org divergence detected, forcing reload');
      window.location.reload();
    }
  }, 5000); // Check every 5 seconds
  
  return () => clearInterval(interval);
}, [profile, fetchProfile]);
```

**Vantagens:**
- Não requer mudanças no backend
- Simples de implementar

**Desvantagens:**
- Polling é ineficiente
- Delay de até 5 segundos
- Tráfego de rede extra

### Opção 3: BroadcastChannel API

Usar BroadcastChannel para sincronizar tabs:

```typescript
// AuthProvider
const channel = new BroadcastChannel('org-switch');

// Quando trocar org
switchOrg(orgId).then(() => {
  channel.postMessage({ type: 'ORG_SWITCHED', orgId });
});

// Em outras tabs
channel.onmessage = (event) => {
  if (event.data.type === 'ORG_SWITCHED') {
    if (event.data.orgId !== profile?.currentOrgId) {
      window.location.reload();
    }
  }
};
```

**Vantagens:**
- Sincronização instantânea entre tabs
- Sem polling
- Sem mudanças no backend

**Desvantagens:**
- Não funciona cross-domain
- Safari tem suporte limitado

## Recomendação Final

**Para produção:** Implementar **Opção 1** (Backend retorna orgId).

**Curto prazo:** Usar logs para identificar se o problema persiste. Se persistir, implementar **Opção 3** (BroadcastChannel) como mitigação temporária.

## Checklist de Deploy

- [x] `useCurrentOrgId()` retorna 'switching' durante org switch
- [x] Todas as queries usam `isOrgIdValid(orgId)`
- [x] Logging adicionado em pontos críticos
- [x] `fetchProfile()` força no-cache
- [x] Build passa
- [ ] Testar cenário multi-tab em staging
- [ ] Monitorar logs no console em produção
- [ ] Se problema persistir, implementar BroadcastChannel

## Status

**Versão:** V2 (Deep Analysis + Logging)
**Data:** 2026-01-09
**Status:** Pronto para deploy com monitoramento
**Próximo passo:** Deploy + observar logs + decidir sobre solução permanente
