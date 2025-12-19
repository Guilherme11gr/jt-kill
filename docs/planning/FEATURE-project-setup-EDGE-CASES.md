---
tags: [planning, edge-cases, qa, critical]
priority: critical
created: 2025-12-18
parent-spec: FEATURE-project-setup.md
target-agent: sonnet-4.5
---

# 🔍 Edge Cases & Validation Guide - Project Setup

> **Objetivo**: Garantir 90%+ de precisão na implementação do Sonnet 4.5.
> 
> **Use este documento JUNTO com**: [FEATURE-project-setup.md](./FEATURE-project-setup.md)
> 
> **Para cada task**: Execute validações e testes deste documento ANTES de marcar como completa.

---

## 🎯 Por que este documento existe?

IAs (incluindo Sonnet 4.5) cometem erros previsíveis em cenários específicos:

| Categoria | Erro Comum | Impacto |
|-----------|------------|---------|
| **Async/Await** | Esquecer `await cookies()` (Next.js 16+) | Runtime error 500 |
| **Type Safety** | Tipos divergentes entre Prisma/Supabase | Build falha silenciosamente |
| **RLS Policies** | Esquecer `org_id` em queries | Data leak entre tenants ⚠️ |
| **Cache** | Misturar React cache com HTTP cache | Stale data ou cache miss |
| **Error Handling** | Try/catch sem `handleError` | Logs vazios, 500 genérico |
| **Imports** | Caminho relativo vs alias `@/` | Inconsistência, refactor difícil |

---

## 🚨 Validações CRÍTICAS por Fase

---

## Fase 1: Supabase Clients - Edge Cases

### ⚠️ Armadilha #1: cookies() assíncrono no Next.js 16

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - Next.js 16 requer await
const cookieStore = cookies();
```

**Correto**:
```typescript
// ✅ CERTO - sempre await
const cookieStore = await cookies();
```

**Validação manual**:
```bash
# Se você vê este erro no terminal:
# "Error: cookies() should be awaited before accessing its value"
# → Task 1.3 está ERRADA, corrigir!
```

---

### ⚠️ Armadilha #2: Variáveis de ambiente undefined

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - se .env.local não existe, app quebra
process.env.NEXT_PUBLIC_SUPABASE_URL!
```

**Correto (adicionar validação)**:
```typescript
// ✅ CERTO - validar no startup
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada');
}
```

**Validação manual após Task 1.1**:
```bash
# 1. Renomear .env.local temporariamente
mv .env.local .env.local.backup

# 2. Tentar rodar dev (DEVE dar erro claro)
npm run dev
# Esperado: Erro na linha do throw new Error

# 3. Restaurar
mv .env.local.backup .env.local
```

---

### ⚠️ Armadilha #3: Middleware matcher muito amplo

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - aplica middleware em TUDO, incluindo _next
export const config = {
  matcher: '/:path*',
};
```

**Correto**:
```typescript
// ✅ CERTO - excluir arquivos estáticos
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Validação manual após Task 1.5**:
```bash
# 1. Rodar dev
npm run dev

# 2. Abrir http://localhost:3000
# 3. Verificar Network tab - arquivos .svg/.png NÃO devem passar pelo middleware
# 4. Se vê header X-Middleware-Next em imagens → ERRADO
```

---

### Edge Case #1: Supabase em Server Component vs Client Component

**Cenário**: Importar client errado causa erro silencioso.

**Teste manual após Fase 1**:

1. **Criar arquivo de teste**: `src/app/test-supabase/page.tsx`
```typescript
import { createClient as createServerClient } from '@/lib/supabase/server';

export default async function TestSupabase() {
  const supabase = await createServerClient();
  const { data, error } = await supabase.from('organizations').select('id').limit(1);
  
  return (
    <div>
      <h1>Supabase Test</h1>
      <pre>{JSON.stringify({ data, error }, null, 2)}</pre>
    </div>
  );
}
```

2. **Acessar**: http://localhost:3000/test-supabase
3. **Resultado esperado**: JSON com `data: [...]` OU `error: { ... }` (se banco vazio)
4. **Resultado ERRADO**: Página em branco ou erro de hydration
5. **Deletar arquivo de teste** após validação

---

### Edge Case #2: Auth middleware loop infinito

**Cenário**: Redirect para `/auth/login` mas login também está protegido.

**Teste manual após Task 1.5**:

1. **Limpar cookies do Supabase**: DevTools → Application → Clear Site Data
2. **Acessar**: http://localhost:3000/
3. **Resultado esperado**: Redirect para `/auth/login` (página pode não existir ainda, mas URL muda)
4. **Resultado ERRADO**: Redirect loop infinito (vê "Too many redirects" no navegador)
5. **Se ocorrer loop**: Verificar que `/auth` está em `isAuthRoute` no middleware

---

## Fase 2: Shared Types - Edge Cases

### ⚠️ Armadilha #4: Enums Prisma vs Enums TypeScript

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - usar string literal ao invés de enum do Prisma
export type TaskStatus = 'BACKLOG' | 'TODO' | 'DOING';
```

**Correto**:
```typescript
// ✅ CERTO - importar do Prisma Client quando disponível
// OU definir separado e sincronizar manualmente
export type TaskStatus = 'BACKLOG' | 'TODO' | 'DOING' | 'REVIEW' | 'QA_READY' | 'DONE';
```

**Validação manual após Task 2.3**:
```bash
# Comparar valores do schema.prisma com src/shared/types/project.types.ts
# DEVEM ser EXATAMENTE iguais (mesma ordem opcional, mas mesmos valores)

# TaskStatus:
# schema.prisma → BACKLOG, TODO, DOING, REVIEW, QA_READY, DONE
# project.types.ts → BACKLOG, TODO, DOING, REVIEW, QA_READY, DONE ✅
```

---

### ⚠️ Armadilha #5: Date vs string em tipos

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - Date no tipo, mas API retorna string ISO
export interface Task {
  createdAt: Date; // API retorna "2025-12-18T10:00:00Z"
}
```

**Correto (usar ambos)**:
```typescript
// ✅ CERTO - tipo para DB (Date) e tipo para API (string)
export interface Task {
  createdAt: Date; // Usado internamente
}

export interface TaskDTO {
  createdAt: string; // Usado em API responses
}
```

**Validação manual após Task 2.4**:
```typescript
// Adicionar comentário nos tipos:
// Task → para uso interno (Prisma retorna Date)
// TaskDTO → para API (JSON.stringify converte Date → string)
```

---

### Edge Case #3: buildReadableId com project_key vazio

**Cenário**: Se `project.key` for null ou vazio, ID fica quebrado.

**Teste manual após Task 2.3**:

```typescript
// Testar no Node.js console ou arquivo temporário
import { buildReadableId } from '@/shared/types/task.types';

console.log(buildReadableId('APP', 1));   // ✅ "APP-1"
console.log(buildReadableId('', 1));      // ❌ "-1" (ERRADO!)
console.log(buildReadableId(null as any, 1)); // ❌ Crash

// Corrigir função:
export function buildReadableId(projectKey: string, localId: number): string {
  if (!projectKey || localId < 1) {
    throw new Error('Invalid project key or local ID');
  }
  return `${projectKey}-${localId}`;
}
```

---

## Fase 3: Utils & Helpers - Edge Cases

### ⚠️ Armadilha #6: formatPhone com inputs inválidos

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - não valida input, pode crashar
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
```

**Teste que quebra**:
```typescript
formatPhone('');           // "(undefined) undefined-undefined"
formatPhone('123');        // "(12) 3-"
formatPhone(null as any);  // Crash
```

**Correto**:
```typescript
// ✅ CERTO - validar comprimento
export function formatPhone(phone: string): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  const digits = cleaned.startsWith('55') ? cleaned.slice(2) : cleaned;
  
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  
  return phone; // Retorna original se não conseguir formatar
}
```

**Validação manual após Task 3.1**:
```typescript
// Criar arquivo test/formatters.test.ts temporário
import { formatPhone, formatPrice } from '@/shared/utils/formatters';

// Testes de edge cases
console.assert(formatPhone('') === '', 'Empty string');
console.assert(formatPhone('5516996140277') === '(16) 99614-0277', 'Full number');
console.assert(formatPhone('123') === '123', 'Invalid length');
console.assert(formatPrice(0) === 'R$ 0,00', 'Zero cents');
console.assert(formatPrice(-100) === '-R$ 1,00', 'Negative');

console.log('✅ All edge cases passed');
```

---

### ⚠️ Armadilha #7: Zod schema divergente do DB

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - permite 100 points, mas DB só aceita Fibonacci
export const storyPointsSchema = z.number().int().min(1).max(100);
```

**Correto**:
```typescript
// ✅ CERTO - validar exatamente como DB constraint
export const storyPointsSchema = z
  .number()
  .int()
  .refine((v) => [1, 2, 3, 5, 8, 13, 21].includes(v), {
    message: 'Deve ser um valor Fibonacci: 1, 2, 3, 5, 8, 13, 21'
  })
  .nullable();
```

**Validação manual após Task 3.2**:
```sql
-- Comparar constraint do DB com Zod schema

-- DB (schema-v2.md):
-- CHECK (points is null or points in (1, 2, 3, 5, 8, 13, 21))

-- Zod (validators.ts):
-- .refine((v) => [1, 2, 3, 5, 8, 13, 21].includes(v))

-- ✅ DEVEM ser idênticos
```

---

### ⚠️ Armadilha #8: extractAuthenticatedTenant sem RLS

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - pega org_id mas não filtra queries
const { tenantId } = await extractAuthenticatedTenant(supabase);
const tasks = await supabase.from('tasks').select('*'); // ⚠️ Vaza dados!
```

**Correto**:
```typescript
// ✅ CERTO - SEMPRE filtrar por org_id em queries
const { tenantId } = await extractAuthenticatedTenant(supabase);
const { data: tasks } = await supabase
  .from('tasks')
  .select('*')
  .eq('org_id', tenantId); // 🔒 Isolamento garantido
```

**Validação manual após Task 3.4**:

1. **Criar checklist** em comentário no arquivo:
```typescript
/**
 * ⚠️ IMPORTANTE: Sempre usar extractAuthenticatedTenant em rotas protegidas
 * 
 * PADRÃO OBRIGATÓRIO:
 * 1. const { tenantId } = await extractAuthenticatedTenant(supabase);
 * 2. TODAS as queries devem incluir .eq('org_id', tenantId)
 * 3. RLS é defense-in-depth, mas código deve ser explícito
 */
```

---

### Edge Case #4: handleError com Supabase PostgrestError

**Cenário**: Supabase retorna erro específico que não é DomainError.

**Teste manual após Task 3.3**:

```typescript
// Criar arquivo temporário test/error-handler.test.ts
import { handleError } from '@/shared/utils/errors';

// Simular erro do Supabase
const supabaseError = {
  message: 'duplicate key value violates unique constraint',
  code: '23505',
  details: 'Key (org_id, key)=(uuid, APP) already exists.',
};

const result = handleError(supabaseError);
console.log(result);

// Resultado esperado:
// { status: 500, body: { error: { code: 'INTERNAL_ERROR', ... } } }

// Se quiser tratar erros Supabase específicos, adicionar no handleError:
if (error && typeof error === 'object' && 'code' in error) {
  const pgError = error as { code: string; message: string };
  
  if (pgError.code === '23505') {
    return {
      status: 409,
      body: {
        error: {
          code: 'CONFLICT',
          message: 'Registro duplicado',
        },
      },
    };
  }
}
```

---

## Fase 4: Prisma Schema - Edge Cases

### ⚠️ Armadilha #9: Prisma schema sem `@db.Uuid`

**Erro que o Sonnet pode cometer**:
```prisma
// ❌ ERRADO - Prisma vai usar String ao invés de UUID
id String @id @default(dbgenerated("gen_random_uuid()"))
```

**Correto**:
```prisma
// ✅ CERTO - explicitar tipo PostgreSQL
id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
```

**Validação manual após cada Task 4.x**:
```bash
# Grep para verificar TODOS os UUIDs têm @db.Uuid
grep -n "String.*@id" prisma/schema.prisma

# TODOS devem ter @db.Uuid no final
# Se encontrar sem → ERRO
```

---

### ⚠️ Armadilha #10: Relações Prisma sem onDelete

**Erro que o Sonnet pode cometer**:
```prisma
// ❌ ERRADO - sem onDelete CASCADE
organization Organization @relation(fields: [orgId], references: [id])
```

**Correto**:
```prisma
// ✅ CERTO - sempre especificar comportamento de delete
organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
```

**Validação manual após Task 4.5**:
```bash
# Grep para verificar TODAS as relations têm onDelete
grep -n "@relation" prisma/schema.prisma | grep -v "onDelete"

# Se retornar linhas → ERRO (falta onDelete)
# Exceto relations reversas (ex: projects Project[]) que não precisam
```

---

### ⚠️ Armadilha #11: Prisma generate sem DATABASE_URL

**Erro que o Sonnet pode cometer**:
```bash
# ❌ ERRADO - rodar sem configurar .env
npm run db:generate
# Error: Environment variable not found: DATABASE_URL
```

**Correto**:
```bash
# ✅ CERTO - adicionar DATABASE_URL no .env.local ANTES do generate
# .env.local:
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

**Validação manual antes de Task 4.5**:

1. **Verificar .env.local tem DATABASE_URL**:
```bash
grep "DATABASE_URL" .env.local
# Deve retornar a connection string
```

2. **Se não tiver, adicionar**:
```env
# Supabase connection strings
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

3. **Executar generate**:
```bash
npm run db:generate
# ✅ Esperado: "✔ Generated Prisma Client"
```

---

### Edge Case #5: Divergência entre Prisma schema e DB real

**Cenário**: Schema Prisma não reflete exatamente o DB criado via MCP Supabase.

**Validação manual após Task 4.5**:

1. **Conectar no Supabase Studio**: https://supabase.com/dashboard/project/_/editor
2. **Executar query de verificação**:
```sql
-- Listar todas as colunas da tabela tasks
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;
```

3. **Comparar com Prisma schema**:
```prisma
model Task {
  id          String       @id @db.Uuid
  orgId       String       @map("org_id") @db.Uuid
  projectId   String       @map("project_id") @db.Uuid
  featureId   String       @map("feature_id") @db.Uuid
  localId     Int          @map("local_id")
  // ... etc
}
```

4. **Checklist de verificação**:
- [ ] Todas as colunas do DB estão no Prisma
- [ ] Todos os tipos correspondem (uuid → @db.Uuid, timestamptz → @db.Timestamptz)
- [ ] `@map()` corresponde ao nome real da coluna no DB
- [ ] ENUMs correspondem (TaskStatus prisma = task_status DB)

---

## Fase 5: Health Check - Edge Cases

### ⚠️ Armadilha #12: Health check sem dynamic force

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - Next.js pode cachear response do health check
export async function GET() {
  // ...
}
```

**Correto**:
```typescript
// ✅ CERTO - forçar execução a cada request
export const dynamic = 'force-dynamic';

export async function GET() {
  // ...
}
```

**Validação manual após Task 5.1**:
```bash
# 1. Rodar dev
npm run dev

# 2. Chamar health check múltiplas vezes
curl http://localhost:3000/api/health
# Timestamp DEVE ser diferente a cada call

# Se timestamp sempre igual → FALTA dynamic = 'force-dynamic'
```

---

### ⚠️ Armadilha #13: Response helpers sem Next.js types

**Erro que o Sonnet pode cometer**:
```typescript
// ❌ ERRADO - tipo genérico Response
function jsonSuccess<T>(data: T): Response {
  return Response.json({ data });
}
```

**Correto**:
```typescript
// ✅ CERTO - usar NextResponse com tipos
import { NextResponse } from 'next/server';

function jsonSuccess<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data });
}
```

**Validação manual após Task 5.2**:
```bash
# Verificar todos os helpers retornam NextResponse
grep -n "function json" src/shared/http/responses.ts

# TODOS devem retornar NextResponse<...>
```

---

### Edge Case #6: Health check falha mas retorna 200

**Cenário**: Supabase offline mas health check retorna sucesso.

**Teste manual após Task 5.1**:

1. **Modificar health check para simular falha**:
```typescript
// Temporariamente forçar erro
const checks = {
  status: 'degraded' as const,
  services: {
    supabase: false,
    database: false,
  },
};

const allHealthy = false; // Forçar
```

2. **Chamar endpoint**:
```bash
curl -i http://localhost:3000/api/health
# Esperado: HTTP/1.1 503 Service Unavailable
```

3. **Se retornar 200 → ERRO**: Status code não está sendo aplicado
4. **Reverter código temporário**

---

## 📋 Checklist Final - Validação Completa

Execute TODOS estes testes antes de considerar o setup completo:

### ✅ Ambiente

- [ ] `.env.local` existe e tem TODAS as variáveis
- [ ] `.env.example` existe e está commitado
- [ ] `.gitignore` contém `.env.local`
- [ ] `DATABASE_URL` e `DIRECT_URL` configuradas

### ✅ Build & Typecheck

- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run lint` passa sem warnings
- [ ] `npm run build` passa completamente
- [ ] `npm run dev` inicia sem erros

### ✅ Supabase Clients

- [ ] Browser client importável em Client Components
- [ ] Server client usa `await cookies()`
- [ ] Middleware não aplica em arquivos estáticos
- [ ] `/auth` rotas não causam loop de redirect

### ✅ Types & DTOs

- [ ] Enums TypeScript = Enums Prisma = Enums DB
- [ ] Tipos de Date documentados (Date vs string)
- [ ] `buildReadableId` valida inputs vazios
- [ ] Re-exports funcionando (`import { ... } from '@/shared/types'`)

### ✅ Utils & Helpers

- [ ] `formatPhone('')` não crasha
- [ ] `formatPrice(0)` retorna "R$ 0,00"
- [ ] Zod schemas = DB constraints (Fibonacci, etc)
- [ ] `extractAuthenticatedTenant` documenta padrão de uso
- [ ] `handleError` trata Zod errors

### ✅ Prisma

- [ ] Todos UUIDs com `@db.Uuid`
- [ ] Todas relations com `onDelete`
- [ ] Schema mapeia TODOS os campos do DB
- [ ] `npm run db:generate` executado com sucesso
- [ ] `@prisma/client` importável

### ✅ Health Check

- [ ] `/api/health` retorna 200 quando healthy
- [ ] `/api/health` retorna 503 quando degraded
- [ ] Timestamp muda a cada request (não cacheia)
- [ ] Response helpers retornam `NextResponse<T>`

### ✅ Imports & Paths

- [ ] TODOS imports usam `@/` alias (não `../../../`)
- [ ] Sem imports relativos profundos (max 2 níveis)
- [ ] Re-exports de índices funcionando

---

## 🧪 Script de Validação Automatizada

Após completar todas as fases, executar este script para validação final:

**Arquivo**: `scripts/validate-setup.sh` (criar temporariamente)

```bash
#!/bin/bash

echo "🔍 Validando setup do projeto..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. Verificar .env.local
echo -n "📄 Verificando .env.local... "
if [ ! -f .env.local ]; then
  echo -e "${RED}✗ ERRO: .env.local não encontrado${NC}"
  ERRORS=$((ERRORS+1))
else
  echo -e "${GREEN}✓${NC}"
fi

# 2. Verificar variáveis obrigatórias
echo -n "🔐 Verificando variáveis de ambiente... "
if ! grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local || \
   ! grep -q "DATABASE_URL" .env.local; then
  echo -e "${RED}✗ ERRO: Variáveis faltando${NC}"
  ERRORS=$((ERRORS+1))
else
  echo -e "${GREEN}✓${NC}"
fi

# 3. Verificar Prisma Client gerado
echo -n "📦 Verificando Prisma Client... "
if [ ! -d "node_modules/.prisma/client" ]; then
  echo -e "${RED}✗ ERRO: Prisma Client não gerado${NC}"
  ERRORS=$((ERRORS+1))
else
  echo -e "${GREEN}✓${NC}"
fi

# 4. Verificar arquivos críticos
echo -n "📁 Verificando arquivos críticos... "
FILES=(
  "src/lib/supabase/client.ts"
  "src/lib/supabase/server.ts"
  "src/middleware.ts"
  "src/shared/types/index.ts"
  "src/shared/utils/formatters.ts"
  "src/shared/http/auth.helpers.ts"
)

MISSING=0
for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}✗ ERRO: $file não encontrado${NC}"
    MISSING=$((MISSING+1))
  fi
done

if [ $MISSING -eq 0 ]; then
  echo -e "${GREEN}✓${NC}"
else
  ERRORS=$((ERRORS+MISSING))
fi

# 5. Typecheck
echo -n "🔍 Executando typecheck... "
if npm run typecheck > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗ ERRO: Typecheck falhou${NC}"
  ERRORS=$((ERRORS+1))
fi

# 6. Build
echo -n "🏗️  Executando build... "
if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗ ERRO: Build falhou${NC}"
  ERRORS=$((ERRORS+1))
fi

# Resultado final
echo ""
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ Validação completa: TUDO OK!${NC}"
  exit 0
else
  echo -e "${RED}❌ Validação falhou: $ERRORS erro(s) encontrado(s)${NC}"
  exit 1
fi
```

**Executar**:
```bash
chmod +x scripts/validate-setup.sh
./scripts/validate-setup.sh
```

**Resultado esperado**: `✅ Validação completa: TUDO OK!`

---

## 🎯 Métricas de Sucesso

Considere o setup 90%+ preciso se:

- [ ] **0 erros** no script de validação
- [ ] **0 erros** em `npm run build`
- [ ] **0 erros** de tipo em `npm run typecheck`
- [ ] **0 warnings** em `npm run lint`
- [ ] **Health check** retornando 200
- [ ] **Dev server** inicia em <5 segundos
- [ ] **Nenhum console.error** ao acessar rotas

---

## 📝 Log de Issues Conhecidas

Se encontrar problemas durante implementação, documente aqui:

### Issue #1: [Título]
- **Fase**: X
- **Task**: Y
- **Erro**: Descrição
- **Solução**: Como resolveu
- **Prevenção**: Como evitar no futuro

*(Adicionar issues conforme surgem)*

---

## 🔄 Próximos Passos

Após validação 100% do setup:

1. **Commitar**: `git add . && git commit -m "feat: complete project setup infrastructure"`
2. **Documentar**: Adicionar screenshot do health check em `/docs/planning/setup-evidence.md`
3. **Prosseguir**: Iniciar [Epic 01 - Auth & Multi-tenancy](../roadmap/01-auth-multi-tenancy.md)

---

## 📚 Referências

- [Next.js 16 Breaking Changes](https://nextjs.org/docs/app/building-your-application/upgrading/version-16)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [React 19 Changes](https://react.dev/blog/2024/12/05/react-19)

---

## 📊 Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | 2025-12-18 | Documento inicial com 13 armadilhas + 6 edge cases |
