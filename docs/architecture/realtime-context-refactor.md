# Refatoração: Singleton → React Context

## 🎯 Objetivo

Resolver problema de múltiplas instâncias de `RealtimeConnectionManager` que causavam:
- 50+ GoTrueClient instances sendo criadas
- Loops de conexão/desconexão
- Performance degradada (tasks carregando lentamente)

## ✅ Solução: React Context Pattern

### Por que Context é melhor que Singleton?

| Aspecto | Singleton ❌ | React Context ✅ |
|---------|-------------|------------------|
| **SSR/Next.js** | Vaza entre requests no servidor | Scoped por request naturalmente |
| **Testabilidade** | Difícil mockar | Fácil mockar com Provider wrapper |
| **Lifecycle** | Cleanup manual | React gerencia automaticamente |
| **Multi-org** | Lógica extra para troca | Re-cria naturalmente com Provider |
| **Padrões React** | Anti-pattern | Idiomático |
| **DevTools** | Invisível | Visível no React DevTools |

## 🔄 Mudanças Implementadas

### 1. RealtimeProvider (nova arquitetura)

**Antes:**
```tsx
// Apenas chamava useRealtimeSync() que criava instâncias por componente
export function RealtimeProvider({ children }) {
  useRealtimeSync();
  return <>{children}</>;
}
```

**Depois:**
```tsx
// Cria UMA ÚNICA instância e expõe via Context
export function RealtimeProvider({ children }) {
  const managerRef = useRef<RealtimeConnectionManager | null>(null);
  const { processEvent } = useRealtimeEventProcessor();
  
  // Cria manager ONCE on mount
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new RealtimeConnectionManager({
        onStatusChange: setStatus,
        onEvent: processEvent, // Event processor integrado
      });
    }
    return () => {
      managerRef.current?.disconnect();
      managerRef.current = null;
    };
  }, [processEvent]);
  
  // Conecta/desconecta quando orgId muda
  useEffect(() => {
    if (orgId && userId && managerRef.current) {
      managerRef.current.connect(orgId, userId);
    }
    return () => managerRef.current?.disconnect();
  }, [orgId, userId]);
  
  return (
    <RealtimeContext.Provider value={{ manager, status, broadcast }}>
      {children}
    </RealtimeContext.Provider>
  );
}
```

✅ **Benefícios:**
- Apenas 1 RealtimeConnectionManager por aplicação
- Apenas 1 GoTrueClient (Supabase client)
- Event processor integrado no Provider
- Lifecycle gerenciado pelo React

### 2. useRealtimeConnection (simplificado)

**Antes:**
```typescript
// Cada componente criava seu próprio manager
export function useRealtimeConnection() {
  const managerRef = useRef<RealtimeConnectionManager | null>(null);
  
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new RealtimeConnectionManager(); // ❌ Múltiplas instâncias
    }
    managerRef.current.connect(orgId, userId);
  }, [orgId, userId]);
  
  return { status, broadcast };
}
```

**Depois:**
```typescript
// Apenas consome o manager do Context
export function useRealtimeConnection() {
  const { manager, status, broadcast } = useRealtimeManager(); // ✅ Context
  
  // Apenas helpers
  const getConnectionStatus = () => manager?.getStatus() || 'disconnected';
  const getTabId = () => manager?.getTabId();
  
  return { status, broadcast, getConnectionStatus, getTabId };
}
```

✅ **Benefícios:**
- Sem criação de instâncias
- Sem gerenciamento de lifecycle
- Código mais simples e direto

### 3. useRealtimeSync (simplificado)

**Antes:**
```typescript
export function useRealtimeSync() {
  const { processEvent } = useRealtimeEventProcessor();
  
  const onEvent = useCallback((event) => {
    processEvent(event); // ❌ Event processor duplicado
  }, []);
  
  const { status, broadcast } = useRealtimeConnection({ onEvent });
  
  return { status, broadcast };
}
```

**Depois:**
```typescript
export function useRealtimeSync() {
  const { status, broadcast } = useRealtimeManager(); // ✅ Direto do Context
  
  // Apenas helpers para callbacks customizados
  const registerEventCallback = useCallback((callback) => {
    eventCallbacksRef.current.add(callback);
    return () => eventCallbacksRef.current.delete(callback);
  }, []);
  
  return { status, broadcast, registerEventCallback };
}
```

✅ **Benefícios:**
- Event processor centralizado no Provider
- Sem duplicação de lógica
- Código mais simples

### 4. Novo hook: useRealtimeManager()

```typescript
export function useRealtimeManager() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeManager must be used within RealtimeProvider');
  }
  return context;
}
```

✅ **Benefícios:**
- Type-safe access ao Context
- Error clara se usado fora do Provider
- Base para todos os outros hooks

## 📊 Resultado Esperado

### Antes (Singleton/múltiplas instâncias):
```
[Log] GoTrueClient instance 55 created
[Log] GoTrueClient instance 56 created
[Log] GoTrueClient instance 57 created
... (50+ instances)
[Log] Connecting...
[Log] Connected
[Log] Disconnecting...
[Log] Connecting... (loop infinito)
```

### Depois (Context):
```
[Log] [RealtimeProvider] Manager created
[Log] [RealtimeProvider] Connecting to org abc-123
[Log] Connected
[Log] Heartbeat started
(apenas 1 instance, 1 conexão, estável)
```

## 🧪 Como Testar

```tsx
import { renderHook } from '@testing-library/react';
import { RealtimeProvider } from '@/providers/realtime-provider';

// ✅ Fácil mockar
function wrapper({ children }) {
  return <RealtimeProvider>{children}</RealtimeProvider>;
}

const { result } = renderHook(() => useRealtimeManager(), { wrapper });
expect(result.current.status).toBe('disconnected');
```

## 📁 Arquivos Modificados

1. `src/providers/realtime-provider.tsx`
   - Criado RealtimeContext
   - Criado useRealtimeManager()
   - Provider gerencia única instância

2. `src/hooks/use-realtime-connection.ts`
   - Simplificado para consumir Context
   - Removida criação de instâncias

3. `src/hooks/use-realtime-sync.ts`
   - Simplificado para consumir Context
   - Removido event processor duplicado

## 🚀 Próximos Passos

1. ✅ TypeScript compilation OK
2. ⏳ Testar no dev (`npm run dev`)
3. ⏳ Verificar logs do console (deve ter APENAS 1 GoTrueClient)
4. ⏳ Confirmar que não há mais loops de conexão
5. ⏳ Testar performance (tasks devem carregar rápido)

## 🎓 Lições Aprendidas

**"Singleton não é React idiomático"**

Quando você tem:
- SSR/Next.js (server components)
- Multi-org/multi-tenant
- Testes automatizados
- Lifecycle management necessário

**Sempre use Context ao invés de Singleton.**

Context é:
- SSR-safe
- Testável
- React idiomático
- Lifecycle gerenciado
- Multi-tenant friendly
