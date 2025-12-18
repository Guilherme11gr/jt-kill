---
tags: [architecture, domain, ddd]
priority: high
last-updated: 2025-12
---

# 📊 Modelo de Domínio (DDD)

## Hierarquia de Entidades

O sistema possui uma hierarquia **rígida e validada**:

```
🏢 Organization (Tenant)
│
└── 📦 Project (Produto)
    │
    ├── 📚 Project Docs (Memória da IA)
    │   └── content: TEXT (Markdown)
    │
    ├── 🏷️ modules: string[] 
    │   └── Ex: ['SDK', 'API', 'WEB']
    │
    └── 🎯 Epic (Objetivo Macro)
        │
        └── ⭐ Feature (Entregável)
            │
            ├── ✅ Task (type: 'TASK')
            │
            └── 🐛 Bug (type: 'BUG')
```

---

## Entidades Detalhadas

### 1. Organization (Tenant)

A empresa/organização. Representa o tenant no sistema multi-tenant.

```typescript
interface Organization {
  id: string;           // UUID
  name: string;         // Nome da organização
  createdAt: Date;
}
```

**Regras:**
- Toda entidade pertence a uma Organization (multi-tenant)
- RLS policies filtram por `org_id`

---

### 2. Project (Produto)

Unidade de entrega de valor. Define escopo técnico e regras de negócio.

```typescript
interface Project {
  id: string;           // UUID
  orgId: string;        // FK Organization
  name: string;         // Ex: "App Mobile"
  key: string;          // Ex: "APP" (prefixo para IDs)
  modules: string[];    // Ex: ['SDK', 'API', 'WEB']
  createdAt: Date;
}
```

**Regras:**
- `key` é único dentro da Organization
- `key` é usado para gerar IDs de tasks (APP-001, APP-002)
- `modules` é controlado pelo Owner do projeto
- Módulos não são tabela separada (array simples)

---

### 3. Project Docs (Memória da IA)

Documentos que servem como contexto para o AI Scribe.

```typescript
interface ProjectDoc {
  id: string;           // UUID
  projectId: string;    // FK Project
  title: string;        // Ex: "Styleguide.md"
  content: string;      // Markdown puro
  createdAt: Date;
}
```

**Regras:**
- Armazenado como TEXT puro no banco
- NÃO usar Supabase Storage
- Usado pelo AI Scribe para gerar tasks contextualizadas

---

### 4. Epic (Objetivo Macro)

Objetivo de negócio de alto nível.

```typescript
interface Epic {
  id: string;           // UUID
  projectId: string;    // FK Project
  title: string;
  description?: string;
  status: EpicStatus;   // 'TODO' | 'IN_PROGRESS' | 'DONE'
  createdAt: Date;
}
```

**Regras:**
- Agrupa Features relacionadas a um objetivo
- Status calculado baseado nas Features filhas

---

### 5. Feature (Entregável)

Entregável funcional que agrega valor ao usuário.

```typescript
interface Feature {
  id: string;           // UUID
  epicId: string;       // FK Epic
  title: string;
  description?: string;
  status: FeatureStatus;
  createdAt: Date;
}
```

**Regras:**
- Agrupa Tasks relacionadas
- **Feature bloqueada** se houver Bugs filhos abertos
- Não pode ir para DONE com bugs pendentes

---

### 6. Task (Unidade de Trabalho)

Unidade indivisível de trabalho.

```typescript
interface Task {
  id: string;           // UUID
  featureId: string;    // FK Feature
  title: string;
  description?: string; // Markdown suportado
  status: TaskStatus;
  type: 'TASK' | 'BUG';
  points?: number;      // Story points (Poker)
  priority: Priority;
  module?: string;      // Deve existir em project.modules
  assigneeId?: string;  // FK auth.users
  createdAt: Date;
}
```

**Regras:**
- `module` deve ser validado contra `project.modules`
- `type=BUG` tem tratamento visual especial (borda vermelha)
- Bugs bloqueiam a Feature pai
- Story points populados via Scrum Poker

---

## Enums e Tipos

### TaskStatus (Workflow Rígido)

```typescript
type TaskStatus = 
  | 'BACKLOG'   // Ideias ou bugs reportados
  | 'TODO'      // Selecionado para o ciclo
  | 'DOING'     // Em desenvolvimento
  | 'REVIEW'    // PR aberto / Code Review
  | 'QA_READY'  // Em ambiente de testes
  | 'DONE';     // Validado e em produção
```

### Priority

```typescript
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
```

### TaskType

```typescript
type TaskType = 'TASK' | 'BUG';
```

---

## Relacionamentos

```
Organization  1 ─────── N  Project
Project       1 ─────── N  ProjectDoc
Project       1 ─────── N  Epic
Epic          1 ─────── N  Feature
Feature       1 ─────── N  Task
Task          1 ─────── N  PokerVote
User          1 ─────── N  Task (assignee)
```

---

## Value Objects

### TaskKey

Identificador único legível da task.

```typescript
// Formato: {PROJECT_KEY}-{SEQUENCE}
// Exemplo: APP-001, SDK-042

interface TaskKey {
  projectKey: string;  // "APP"
  sequence: number;    // 1, 2, 3...
  toString(): string;  // "APP-001"
}
```

### Module

Contexto técnico dentro de um projeto.

```typescript
// Implementado como string no array project.modules
// Exemplos: 'SDK', 'API', 'WEB', 'MOBILE', 'AUTH'

// Cores são geradas via hash da string para consistência
function getModuleColor(module: string): string {
  const hash = hashString(module);
  return COLORS[hash % COLORS.length];
}
```

---

## Agregados

### Project Aggregate

```
Project (Root)
├── modules[]
├── ProjectDoc[]
└── Epic[]
    └── Feature[]
        └── Task[]
```

**Regras do Agregado:**
- Operações em Tasks passam pelo Project
- Módulos são validados no nível do Project
- Deleção em cascata: Project → Epic → Feature → Task

---

## Invariantes de Domínio

### 1. Feature Blocking
```typescript
// Feature não pode ser DONE se houver bugs abertos
function canFeatureBeDone(feature: Feature, tasks: Task[]): boolean {
  const openBugs = tasks.filter(t => 
    t.type === 'BUG' && t.status !== 'DONE'
  );
  return openBugs.length === 0;
}
```

### 2. Module Validation
```typescript
// Task.module deve existir em Project.modules
function validateModule(task: Task, project: Project): void {
  if (task.module && !project.modules.includes(task.module)) {
    throw new DomainError(`Módulo '${task.module}' não existe no projeto`);
  }
}
```

### 3. Bug Requirements
```typescript
// Bugs devem ter descrição
function validateBug(task: Task): void {
  if (task.type === 'BUG' && !task.description) {
    throw new DomainError('Bugs devem ter descrição');
  }
}
```

---

## Ver Também

- [workflows.md](./workflows.md) - Máquina de estados detalhada
- [../database/schema.md](../database/schema.md) - Schema SQL
