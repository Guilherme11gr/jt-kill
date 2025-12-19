---
tags: [planning, setup, infrastructure, critical]
priority: critical
created: 2025-12-18
epic: 01-auth-multi-tenancy
target-agent: sonnet-4.5
estimated-time: 4-6 hours
---

# 🚀 Feature Spec: Project Setup & Infrastructure

> **Objetivo**: Configurar toda a infraestrutura base do projeto antes de implementar features.
> 
> **Pré-requisito**: Database criado via [IMPLEMENTATION-SPEC.md](../database/IMPLEMENTATION-SPEC.md)

---

## 📋 Contexto

### Stack Atual (já instalado)
```
✅ Next.js 16.1.0 (App Router)
✅ React 19.2.3
✅ TypeScript 5.x (strict mode)
✅ Tailwind CSS 4.0
✅ Shadcn/UI (12 componentes)
✅ Supabase SSR + JS Client
✅ Prisma 7.2.0
✅ Zod 4.2.1
✅ date-fns + date-fns-tz
✅ Lucide React (ícones)
```

### O que FALTA configurar
```
❌ Supabase Client (server + browser)
❌ Prisma Schema sincronizado com DB
❌ Middleware de Auth
❌ Helpers de autenticação
❌ Tipos compartilhados (DTOs)
❌ Utils de formatação
❌ Error handling padronizado
❌ Rate limiting básico
❌ Variáveis de ambiente
```

---

## 🎯 Objetivos desta Feature

1. **Conexão Supabase**: Clients configurados para SSR e Client Components
2. **Prisma Sync**: Schema alinhado com banco de dados
3. **Auth Foundation**: Middleware + helpers básicos
4. **Shared Types**: DTOs e tipos reutilizáveis
5. **Utils Layer**: Formatadores, validators, error handlers
6. **Anti N+1**: Padrões de query otimizados desde o início

---

## 🚫 Anti-Patterns a Evitar (N+1)

### ❌ NUNCA faça isso:
```typescript
// N+1: Uma query por task para buscar feature
const tasks = await prisma.task.findMany({ where: { orgId } });
for (const task of tasks) {
  const feature = await prisma.feature.findUnique({ where: { id: task.featureId } });
  // ...
}
```

### ✅ SEMPRE faça isso:
```typescript
// Uma única query com include
const tasks = await prisma.task.findMany({
  where: { orgId },
  include: {
    feature: {
      include: { epic: true }
    }
  }
});
```

### ✅ Ou use select para campos específicos:
```typescript
// Otimizado: só campos necessários
const tasks = await prisma.task.findMany({
  where: { orgId },
  select: {
    id: true,
    localId: true,
    title: true,
    status: true,
    feature: {
      select: {
        title: true,
        epic: {
          select: { title: true }
        }
      }
    }
  }
});
```

---

## 📁 Estrutura de Arquivos a Criar

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server client (cookies)
│   │   ├── middleware.ts      # Auth middleware helper
│   │   └── types.ts           # Database types (gerado)
│   └── utils.ts               # (já existe)
│
├── infra/
│   └── adapters/
│       └── supabase/
│           ├── auth.adapter.ts     # Auth operations
│           └── storage.adapter.ts  # (futuro)
│
├── shared/
│   ├── types/
│   │   ├── index.ts           # Re-exports
│   │   ├── auth.types.ts      # Auth DTOs
│   │   ├── project.types.ts   # Project DTOs
│   │   ├── task.types.ts      # Task DTOs
│   │   └── api.types.ts       # API response types
│   │
│   ├── utils/
│   │   ├── formatters.ts      # Dinheiro, telefone, datas
│   │   ├── validators.ts      # Zod schemas compartilhados
│   │   └── errors.ts          # Custom errors + handler
│   │
│   └── http/
│       ├── auth.helpers.ts    # extractAuthenticatedTenant
│       ├── cache.headers.ts   # cacheHeaders helper
│       └── responses.ts       # JSON response helpers
│
├── middleware.ts              # Next.js middleware (auth)
│
└── app/
    └── api/
        └── health/
            └── route.ts       # Health check endpoint
```

---

## 🔢 Fases de Implementação

---

## Fase 1: Supabase Clients (5 tasks)

> **Objetivo**: Configurar clients Supabase para SSR e Client Components.
> **Dependências**: Variáveis de ambiente configuradas

### Task 1.1: Criar arquivo de variáveis de ambiente

**Arquivo**: `.env.local` (NÃO committar!)

**Conteúdo**:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Arquivo**: `.env.example` (committar como template)

**Conteúdo**:
```env
# Supabase - Get from https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Validação**: Arquivo `.env.example` existe e `.env.local` está no `.gitignore`

---

### Task 1.2: Criar Supabase Browser Client

**Arquivo**: `src/lib/supabase/client.ts`

**Conteúdo**:
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Validação**: `npm run typecheck` passa

---

### Task 1.3: Criar Supabase Server Client

**Arquivo**: `src/lib/supabase/server.ts`

**Conteúdo**:
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component - cookies are read-only
          }
        },
      },
    }
  );
}
```

**Validação**: `npm run typecheck` passa

---

### Task 1.4: Criar Supabase Middleware Helper

**Arquivo**: `src/lib/supabase/middleware.ts`

**Conteúdo**:
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not write logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make your app
  // very slow (user session not refreshed on every request).

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes check
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isPublicRoute = request.nextUrl.pathname === '/' || 
                        request.nextUrl.pathname.startsWith('/public');

  if (!user && !isAuthRoute && !isApiRoute && !isPublicRoute) {
    // Redirect to login if accessing protected route without auth
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

**Validação**: `npm run typecheck` passa

---

### Task 1.5: Criar Next.js Middleware

**Arquivo**: `src/middleware.ts`

**Conteúdo**:
```typescript
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Validação**: `npm run build` passa

---

## Fase 2: Shared Types & DTOs (5 tasks)

> **Objetivo**: Criar tipos TypeScript reutilizáveis para toda a aplicação.
> **Dependências**: Fase 1 completa

### Task 2.1: Criar tipos de Auth

**Arquivo**: `src/shared/types/auth.types.ts`

**Conteúdo**:
```typescript
import type { User } from '@supabase/supabase-js';

// User roles in organization
export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER';

// Authenticated context extracted from session
export interface AuthenticatedTenant {
  userId: string;
  tenantId: string; // org_id
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
```

**Validação**: `npm run typecheck` passa

---

### Task 2.2: Criar tipos de Project

**Arquivo**: `src/shared/types/project.types.ts`

**Conteúdo**:
```typescript
// Project status types
export type EpicStatus = 'OPEN' | 'CLOSED';
export type FeatureStatus = 'BACKLOG' | 'TODO' | 'DOING' | 'DONE';
export type TaskStatus = 'BACKLOG' | 'TODO' | 'DOING' | 'REVIEW' | 'QA_READY' | 'DONE';
export type TaskType = 'TASK' | 'BUG';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PokerStatus = 'VOTING' | 'REVEALED' | 'CLOSED';

// Fibonacci points
export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13 | 21 | null;
export type PokerVote = 0 | 1 | 2 | 3 | 5 | 8 | 13 | 21; // 0 = "?"

// Organization (Tenant)
export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

// Project
export interface Project {
  id: string;
  orgId: string;
  name: string;
  key: string; // Prefix for task IDs (APP, SDK, etc)
  description: string | null;
  modules: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Epic
export interface Epic {
  id: string;
  orgId: string;
  projectId: string;
  title: string;
  description: string | null;
  status: EpicStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Feature
export interface Feature {
  id: string;
  orgId: string;
  epicId: string;
  title: string;
  description: string | null;
  status: FeatureStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

**Validação**: `npm run typecheck` passa

---

### Task 2.3: Criar tipos de Task

**Arquivo**: `src/shared/types/task.types.ts`

**Conteúdo**:
```typescript
import type { TaskStatus, TaskType, TaskPriority, StoryPoints } from './project.types';

// Base Task
export interface Task {
  id: string;
  orgId: string;
  projectId: string;
  featureId: string;
  localId: number; // Sequential ID per project
  title: string;
  description: string | null;
  status: TaskStatus;
  type: TaskType;
  priority: TaskPriority;
  points: StoryPoints;
  module: string | null;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Task with human-readable ID (for display)
export interface TaskWithReadableId extends Task {
  readableId: string; // e.g., "APP-123"
}

// Task with relations (for detail view)
export interface TaskWithRelations extends Task {
  feature: {
    id: string;
    title: string;
    epic: {
      id: string;
      title: string;
      project: {
        id: string;
        name: string;
        key: string;
      };
    };
  };
  assignee: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

// Comment on task
export interface TaskComment {
  id: string;
  orgId: string;
  taskId: string;
  userId: string;
  content: string; // Markdown
  createdAt: Date;
  updatedAt: Date;
}

// Comment with author info
export interface TaskCommentWithAuthor extends TaskComment {
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

// Helper to build readable ID
export function buildReadableId(projectKey: string, localId: number): string {
  return `${projectKey}-${localId}`;
}
```

**Validação**: `npm run typecheck` passa

---

### Task 2.4: Criar tipos de API Response

**Arquivo**: `src/shared/types/api.types.ts`

**Conteúdo**:
```typescript
// Standard API response wrapper
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

// Error response
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Pagination params
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// Sort params
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Filter params for tasks
export interface TaskFilterParams extends PaginationParams, SortParams {
  status?: string | string[];
  type?: string;
  priority?: string;
  assigneeId?: string;
  module?: string;
  epicId?: string;
  featureId?: string;
  search?: string;
}

// Common list response
export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

**Validação**: `npm run typecheck` passa

---

### Task 2.5: Criar index de re-export

**Arquivo**: `src/shared/types/index.ts`

**Conteúdo**:
```typescript
// Auth types
export * from './auth.types';

// Project/Domain types
export * from './project.types';

// Task types
export * from './task.types';

// API types
export * from './api.types';
```

**Validação**: `npm run typecheck` passa

---

## Fase 3: Utils & Helpers (5 tasks)

> **Objetivo**: Criar utilitários compartilhados para formatação e validação.
> **Dependências**: Fase 2 completa

### Task 3.1: Criar formatters

**Arquivo**: `src/shared/utils/formatters.ts`

**Conteúdo**:
```typescript
/**
 * Format price from cents to BRL currency string
 * @param cents - Price in cents (e.g., 12345 = R$ 123,45)
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

/**
 * Format phone number with Brazilian mask
 * @param phone - Phone number (e.g., "5516996140277" → "(16) 99614-0277")
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // Remove country code if present
  const digits = cleaned.startsWith('55') ? cleaned.slice(2) : cleaned;
  
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  
  return phone; // Return original if can't format
}

/**
 * Format date to Brazilian locale
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', options).format(d);
}

/**
 * Format relative time (e.g., "há 2 horas")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays}d`;
  
  return formatDate(d);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Slugify string for URLs
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
```

**Validação**: `npm run typecheck` passa

---

### Task 3.2: Criar validators com Zod

**Arquivo**: `src/shared/utils/validators.ts`

**Conteúdo**:
```typescript
import { z } from 'zod';

// UUID validator
export const uuidSchema = z.string().uuid('ID inválido');

// Slug validator (URL-friendly)
export const slugSchema = z
  .string()
  .min(2, 'Mínimo 2 caracteres')
  .max(50, 'Máximo 50 caracteres')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Apenas letras minúsculas, números e hífens');

// Project key validator (e.g., APP, SDK)
export const projectKeySchema = z
  .string()
  .min(2, 'Mínimo 2 caracteres')
  .max(10, 'Máximo 10 caracteres')
  .regex(/^[A-Z0-9]+$/, 'Apenas letras maiúsculas e números');

// Pagination validator
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Task status validator
export const taskStatusSchema = z.enum([
  'BACKLOG',
  'TODO',
  'DOING',
  'REVIEW',
  'QA_READY',
  'DONE',
]);

// Task type validator
export const taskTypeSchema = z.enum(['TASK', 'BUG']);

// Task priority validator
export const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

// Story points validator (Fibonacci)
export const storyPointsSchema = z
  .number()
  .int()
  .refine((v) => [1, 2, 3, 5, 8, 13, 21].includes(v), 'Deve ser Fibonacci')
  .nullable();

// Create task input validator
export const createTaskSchema = z.object({
  featureId: uuidSchema,
  title: z.string().min(3, 'Mínimo 3 caracteres').max(200, 'Máximo 200 caracteres'),
  description: z.string().max(10000).nullable().optional(),
  type: taskTypeSchema.default('TASK'),
  priority: taskPrioritySchema.default('MEDIUM'),
  points: storyPointsSchema.optional(),
  module: z.string().max(50).nullable().optional(),
  assigneeId: uuidSchema.nullable().optional(),
});

// Update task input validator
export const updateTaskSchema = createTaskSchema.partial().extend({
  status: taskStatusSchema.optional(),
});

// Create comment validator
export const createCommentSchema = z.object({
  taskId: uuidSchema,
  content: z.string().min(1, 'Comentário não pode ser vazio').max(10000),
});

// Helper to parse with error handling
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  return result;
}
```

**Validação**: `npm run typecheck` passa

---

### Task 3.3: Criar error handling

**Arquivo**: `src/shared/utils/errors.ts`

**Conteúdo**:
```typescript
// Base domain error
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

// Specific error types
export class NotFoundError extends DomainError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} com ID ${id} não encontrado` : `${resource} não encontrado`,
      'NOT_FOUND',
      404
    );
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Não autenticado') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Sem permissão para esta ação') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends DomainError {
  constructor(
    message: string,
    public readonly details?: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends DomainError {
  constructor(message = 'Muitas requisições, tente novamente mais tarde') {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}

// Error handler for API routes
export function handleError(error: unknown): {
  status: number;
  body: { error: { code: string; message: string; details?: unknown } };
} {
  // Known domain errors
  if (error instanceof DomainError) {
    return {
      status: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error instanceof ValidationError ? error.details : undefined,
        },
      },
    };
  }

  // Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: Array<{ path: string[]; message: string }> };
    const details: Record<string, string[]> = {};
    
    for (const issue of zodError.issues) {
      const path = issue.path.join('.');
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }

    return {
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details,
        },
      },
    };
  }

  // Unknown errors - log and return generic message
  console.error('Unexpected error:', error);
  
  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor',
      },
    },
  };
}
```

**Validação**: `npm run typecheck` passa

---

### Task 3.4: Criar auth helpers

**Arquivo**: `src/shared/http/auth.helpers.ts`

**Conteúdo**:
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthenticatedTenant } from '@/shared/types';
import { UnauthorizedError, ForbiddenError } from '@/shared/utils/errors';

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
```

**Validação**: `npm run typecheck` passa

---

### Task 3.5: Criar cache headers helper

**Arquivo**: `src/shared/http/cache.headers.ts`

**Conteúdo**:
```typescript
type CacheDuration = 'none' | 'short' | 'medium' | 'long' | 'immutable';

const CACHE_CONFIGS: Record<CacheDuration, string> = {
  none: 'no-store, no-cache, must-revalidate',
  short: 'public, max-age=60, stale-while-revalidate=30', // 1 min
  medium: 'public, max-age=300, stale-while-revalidate=60', // 5 min
  long: 'public, max-age=3600, stale-while-revalidate=300', // 1 hour
  immutable: 'public, max-age=31536000, immutable', // 1 year
};

/**
 * Get cache headers for API responses.
 * 
 * @param duration - Cache duration preset
 * @returns Headers object to spread in Response
 * 
 * @example
 * return Response.json(data, {
 *   headers: cacheHeaders('short'),
 * });
 */
export function cacheHeaders(duration: CacheDuration): HeadersInit {
  return {
    'Cache-Control': CACHE_CONFIGS[duration],
  };
}

/**
 * Get cache headers for private data (user-specific).
 * Uses private directive - cached by browser but not CDN.
 */
export function privateCacheHeaders(maxAge: number = 60): HeadersInit {
  return {
    'Cache-Control': `private, max-age=${maxAge}`,
  };
}
```

**Validação**: `npm run typecheck` passa

---

## Fase 4: Prisma Schema Sync (5 tasks)

> **Objetivo**: Sincronizar Prisma Schema com o banco de dados criado.
> **Dependências**: Database criado via IMPLEMENTATION-SPEC.md

### Task 4.1: Atualizar Prisma Schema - Models Base

**Arquivo**: `prisma/schema.prisma` (substituir conteúdo)

**Conteúdo - Parte 1** (copiar EXATAMENTE):
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============================================
// ENUMS
// ============================================

enum UserRole {
  OWNER
  ADMIN
  MEMBER
}

enum EpicStatus {
  OPEN
  CLOSED
}

enum FeatureStatus {
  BACKLOG
  TODO
  DOING
  DONE
}

enum TaskStatus {
  BACKLOG
  TODO
  DOING
  REVIEW
  QA_READY
  DONE
}

enum TaskType {
  TASK
  BUG
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum PokerStatus {
  VOTING
  REVEALED
  CLOSED
}

// ============================================
// MODELS
// ============================================

model Organization {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name      String
  slug      String   @unique
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  userProfiles  UserProfile[]
  projects      Project[]
  projectDocs   ProjectDoc[]
  epics         Epic[]
  features      Feature[]
  tasks         Task[]
  pokerSessions PokerSession[]
  comments      Comment[]

  @@map("organizations")
}

model UserProfile {
  id          String   @id @db.Uuid
  orgId       String   @map("org_id") @db.Uuid
  displayName String?  @map("display_name")
  avatarUrl   String?  @map("avatar_url")
  role        UserRole @default(MEMBER)
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId])
  @@map("user_profiles")
}
```

**Validação**: Arquivo salvo sem erros de sintaxe

---

### Task 4.2: Atualizar Prisma Schema - Project & Docs

**Arquivo**: `prisma/schema.prisma` (adicionar após UserProfile)

**Conteúdo - Parte 2**:
```prisma
model Project {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orgId       String   @map("org_id") @db.Uuid
  name        String
  key         String
  description String?
  modules     String[] @default([])
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  organization Organization  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  projectDocs  ProjectDoc[]
  epics        Epic[]
  tasks        Task[]

  @@unique([orgId, key])
  @@index([orgId])
  @@map("projects")
}

model ProjectDoc {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orgId     String   @map("org_id") @db.Uuid
  projectId String   @map("project_id") @db.Uuid
  title     String
  content   String
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([orgId])
  @@map("project_docs")
}
```

**Validação**: Arquivo salvo sem erros de sintaxe

---

### Task 4.3: Atualizar Prisma Schema - Epic & Feature

**Arquivo**: `prisma/schema.prisma` (adicionar após ProjectDoc)

**Conteúdo - Parte 3**:
```prisma
model Epic {
  id          String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orgId       String     @map("org_id") @db.Uuid
  projectId   String     @map("project_id") @db.Uuid
  title       String
  description String?
  status      EpicStatus @default(OPEN)
  createdAt   DateTime   @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime   @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  features     Feature[]

  @@index([projectId])
  @@index([orgId])
  @@map("epics")
}

model Feature {
  id          String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orgId       String        @map("org_id") @db.Uuid
  epicId      String        @map("epic_id") @db.Uuid
  title       String
  description String?
  status      FeatureStatus @default(BACKLOG)
  createdAt   DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime      @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  epic         Epic         @relation(fields: [epicId], references: [id], onDelete: Cascade)
  tasks        Task[]

  @@index([epicId])
  @@index([orgId])
  @@map("features")
}
```

**Validação**: Arquivo salvo sem erros de sintaxe

---

### Task 4.4: Atualizar Prisma Schema - Task & Comment

**Arquivo**: `prisma/schema.prisma` (adicionar após Feature)

**Conteúdo - Parte 4**:
```prisma
model Task {
  id          String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orgId       String       @map("org_id") @db.Uuid
  projectId   String       @map("project_id") @db.Uuid
  featureId   String       @map("feature_id") @db.Uuid
  localId     Int          @map("local_id")
  title       String
  description String?
  status      TaskStatus   @default(BACKLOG)
  type        TaskType     @default(TASK)
  priority    TaskPriority @default(MEDIUM)
  points      Int?         @db.SmallInt
  module      String?
  assigneeId  String?      @map("assignee_id") @db.Uuid
  createdAt   DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime     @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  organization  Organization   @relation(fields: [orgId], references: [id], onDelete: Cascade)
  project       Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  feature       Feature        @relation(fields: [featureId], references: [id], onDelete: Cascade)
  pokerSession  PokerSession?
  comments      Comment[]

  @@unique([projectId, localId])
  @@index([featureId])
  @@index([orgId])
  @@index([projectId])
  @@index([assigneeId, status])
  @@map("tasks")
}

model Comment {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orgId     String   @map("org_id") @db.Uuid
  taskId    String   @map("task_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  content   String
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  task         Task         @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@index([orgId])
  @@index([userId])
  @@map("comments")
}
```

**Validação**: Arquivo salvo sem erros de sintaxe

---

### Task 4.5: Atualizar Prisma Schema - Poker + Executar Generate

**Arquivo**: `prisma/schema.prisma` (adicionar após Comment)

**Conteúdo - Parte 5**:
```prisma
model PokerSession {
  id         String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orgId      String      @map("org_id") @db.Uuid
  taskId     String      @unique @map("task_id") @db.Uuid
  status     PokerStatus @default(VOTING)
  createdBy  String      @map("created_by") @db.Uuid
  revealedAt DateTime?   @map("revealed_at") @db.Timestamptz
  createdAt  DateTime    @default(now()) @map("created_at") @db.Timestamptz
  updatedAt  DateTime    @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  task         Task         @relation(fields: [taskId], references: [id], onDelete: Cascade)
  votes        PokerVote[]

  @@index([taskId])
  @@index([orgId])
  @@map("poker_sessions")
}

model PokerVote {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sessionId String   @map("session_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  vote      Int      @db.SmallInt
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  // Relations
  session PokerSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@unique([sessionId, userId])
  @@index([sessionId])
  @@map("poker_votes")
}
```

**Após salvar o arquivo completo, executar**:
```bash
npm run db:generate
```

**Validação**: Comando executa sem erros, Prisma Client gerado

---

## Fase 5: Health Check & Verificação Final (5 tasks)

> **Objetivo**: Criar endpoint de health check e validar toda a configuração.
> **Dependências**: Fases 1-4 completas

### Task 5.1: Criar Health Check Endpoint

**Arquivo**: `src/app/api/health/route.ts`

**Conteúdo**:
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
    services: {
      supabase: false,
      database: false,
    },
  };

  try {
    // Check Supabase connection
    const supabase = await createClient();
    const { error: authError } = await supabase.auth.getSession();
    checks.services.supabase = !authError;

    // Check database connection
    const { error: dbError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    checks.services.database = !dbError;

  } catch (error) {
    console.error('Health check failed:', error);
    checks.status = 'degraded' as const;
  }

  const allHealthy = Object.values(checks.services).every(Boolean);

  return NextResponse.json(checks, {
    status: allHealthy ? 200 : 503,
  });
}
```

**Validação**: `npm run typecheck` passa

---

### Task 5.2: Criar Response Helpers

**Arquivo**: `src/shared/http/responses.ts`

**Conteúdo**:
```typescript
import { NextResponse } from 'next/server';
import type { ApiResponse, ApiError, ListResponse } from '@/shared/types';
import { cacheHeaders, privateCacheHeaders } from './cache.headers';

/**
 * Success response with data
 */
export function jsonSuccess<T>(
  data: T,
  options?: {
    status?: number;
    cache?: 'none' | 'short' | 'medium' | 'long';
    private?: boolean;
  }
): NextResponse<ApiResponse<T>> {
  const { status = 200, cache = 'none', private: isPrivate = false } = options ?? {};

  const headers = isPrivate
    ? privateCacheHeaders()
    : cacheHeaders(cache);

  return NextResponse.json({ data }, { status, headers });
}

/**
 * List response with pagination
 */
export function jsonList<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  options?: {
    cache?: 'none' | 'short' | 'medium';
    private?: boolean;
  }
): NextResponse<ApiResponse<ListResponse<T>>> {
  const { cache = 'none', private: isPrivate = false } = options ?? {};

  const headers = isPrivate
    ? privateCacheHeaders()
    : cacheHeaders(cache);

  const response: ListResponse<T> = {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };

  return NextResponse.json({ data: response }, { headers });
}

/**
 * Error response
 */
export function jsonError(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, unknown>
): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code, message, details } },
    { status }
  );
}

/**
 * Not found response
 */
export function jsonNotFound(resource: string): NextResponse<ApiError> {
  return jsonError('NOT_FOUND', `${resource} não encontrado`, 404);
}

/**
 * Unauthorized response
 */
export function jsonUnauthorized(
  message = 'Não autenticado'
): NextResponse<ApiError> {
  return jsonError('UNAUTHORIZED', message, 401);
}

/**
 * Forbidden response
 */
export function jsonForbidden(
  message = 'Sem permissão'
): NextResponse<ApiError> {
  return jsonError('FORBIDDEN', message, 403);
}

/**
 * Validation error response
 */
export function jsonValidationError(
  details: Record<string, string[]>
): NextResponse<ApiError> {
  return jsonError('VALIDATION_ERROR', 'Dados inválidos', 400, details);
}
```

**Validação**: `npm run typecheck` passa

---

### Task 5.3: Criar índice de exports HTTP

**Arquivo**: `src/shared/http/index.ts`

**Conteúdo**:
```typescript
// Auth helpers
export { extractAuthenticatedTenant, requireRole } from './auth.helpers';

// Cache helpers
export { cacheHeaders, privateCacheHeaders } from './cache.headers';

// Response helpers
export {
  jsonSuccess,
  jsonList,
  jsonError,
  jsonNotFound,
  jsonUnauthorized,
  jsonForbidden,
  jsonValidationError,
} from './responses';
```

**Validação**: `npm run typecheck` passa

---

### Task 5.4: Criar índice de exports Utils

**Arquivo**: `src/shared/utils/index.ts`

**Conteúdo**:
```typescript
// Formatters
export {
  formatPrice,
  formatPhone,
  formatDate,
  formatRelativeTime,
  truncate,
  slugify,
} from './formatters';

// Validators
export {
  uuidSchema,
  slugSchema,
  projectKeySchema,
  paginationSchema,
  taskStatusSchema,
  taskTypeSchema,
  taskPrioritySchema,
  storyPointsSchema,
  createTaskSchema,
  updateTaskSchema,
  createCommentSchema,
  safeParse,
} from './validators';

// Errors
export {
  DomainError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  RateLimitError,
  handleError,
} from './errors';
```

**Validação**: `npm run typecheck` passa

---

### Task 5.5: Validação Final - Build & Typecheck

**Comandos a executar em sequência**:

```bash
# 1. Verificar tipos
npm run typecheck

# 2. Verificar lint
npm run lint

# 3. Build completo
npm run build
```

**Validação**: Todos os comandos passam sem erros

**Checklist Final**:
- [ ] `.env.local` criado com credenciais Supabase
- [ ] `.env.example` commitado como template
- [ ] Supabase clients funcionando (browser + server)
- [ ] Middleware de auth protegendo rotas
- [ ] Tipos compartilhados exportados
- [ ] Formatters e validators funcionando
- [ ] Error handling padronizado
- [ ] Health check retornando 200
- [ ] Build passando sem erros

---

## 🎉 Implementação Completa!

### Próximos Passos

Após completar esta feature, o projeto está pronto para:

1. **Epic 01**: Implementar autenticação (login, signup, logout)
2. **Epic 02**: Implementar CRUD de projetos
3. **Epic 03**: Implementar Kanban board

### Estrutura Final

```
src/
├── lib/supabase/          ✅ Clients configurados
├── shared/
│   ├── types/             ✅ DTOs tipados
│   ├── utils/             ✅ Formatters + Validators + Errors
│   └── http/              ✅ Auth helpers + Cache + Responses
├── middleware.ts          ✅ Auth middleware
└── app/api/health/        ✅ Health check endpoint
```

---

## 📝 Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | 2025-12-18 | Spec inicial com 5 fases |
