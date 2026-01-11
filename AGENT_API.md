# JT-Kill Agent API

## Autenticação

Todas as rotas (exceto `/api/agent`) requerem header:
```
Authorization: Bearer agk_xxxxxxxxxxxxx
```

## Base URL
```
http://localhost:3000/api/agent
```

---

## Documentação
```
GET /api/agent
```
Retorna JSON com todos endpoints disponíveis. Sem autenticação.

---

## Tasks

### Listar Tasks
```
GET /api/agent/tasks
```
Query params:
- `featureId` (uuid, opcional)
- `epicId` (uuid, opcional)
- `projectId` (uuid, opcional)
- `status` (enum: BACKLOG, TODO, DOING, REVIEW, DONE)
- `limit` (number, default: 50, max: 100)

### Criar Task
```
POST /api/agent/tasks
```
Body:
```json
{
  "title": "string (required)",
  "featureId": "uuid (required)",
  "description": "string (optional, markdown)",
  "type": "TASK | BUG (default: TASK)",
  "priority": "LOW | MEDIUM | HIGH | CRITICAL (default: MEDIUM)",
  "status": "BACKLOG | TODO | DOING | REVIEW | DONE (default: BACKLOG)"
}
```

### Buscar Task
```
GET /api/agent/tasks/:id
```

### Atualizar Task
```
PATCH /api/agent/tasks/:id
```
Body (todos opcionais):
```json
{
  "title": "string",
  "description": "string",
  "type": "TASK | BUG",
  "priority": "LOW | MEDIUM | HIGH | CRITICAL",
  "status": "BACKLOG | TODO | DOING | REVIEW | DONE"
}
```

### Deletar Task
```
DELETE /api/agent/tasks/:id
```

---

## Features

### Listar Features
```
GET /api/agent/features
```
Query params:
- `epicId` (uuid, opcional)
- `status` (enum: BACKLOG, TODO, DOING, DONE)
- `limit` (number, default: 50)

### Criar Feature
```
POST /api/agent/features
```
Body:
```json
{
  "title": "string (required)",
  "epicId": "uuid (required)",
  "description": "string (optional)",
  "status": "BACKLOG | TODO | DOING | DONE (default: BACKLOG)"
}
```

### Buscar Feature
```
GET /api/agent/features/:id
```

### Atualizar Feature
```
PATCH /api/agent/features/:id
```

---

## Epics (Read-only)

### Listar Epics
```
GET /api/agent/epics
```
Query params:
- `projectId` (uuid, opcional)
- `status` (enum: OPEN, IN_PROGRESS, DONE)
- `limit` (number, default: 50)

### Buscar Epic
```
GET /api/agent/epics/:id
```

---

## Projects (Read-only)

### Listar Projects
```
GET /api/agent/projects
```

---

## Docs (Markdown)

### Listar Docs
```
GET /api/agent/docs?projectId=uuid
```
Query params:
- `projectId` (uuid, **required**)
- `limit` (number, default: 50)

### Criar Doc
```
POST /api/agent/docs
```
Body:
```json
{
  "title": "string (required)",
  "projectId": "uuid (required)",
  "content": "string (required, markdown)"
}
```

### Buscar Doc
```
GET /api/agent/docs/:id
```

### Atualizar Doc
```
PATCH /api/agent/docs/:id
```
Body:
```json
{
  "title": "string (optional)",
  "content": "string (optional)"
}
```

### Deletar Doc
```
DELETE /api/agent/docs/:id
```

---

## Tags

### Listar Tags
```
GET /api/agent/tags?projectId=uuid
```
Query params:
- `projectId` (uuid, **required**)
- `limit` (number, default: 50)

### Criar Tag
```
POST /api/agent/tags
```
Body:
```json
{
  "name": "string (required, max 50 chars)",
  "projectId": "uuid (required)"
}
```

### Buscar Tag
```
GET /api/agent/tags/:id
```

### Deletar Tag
```
DELETE /api/agent/tags/:id
```

---

## Formato de Resposta

### Sucesso (item único)
```json
{
  "success": true,
  "data": { ... }
}
```

### Sucesso (lista)
```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "total": 42 }
}
```

### Erro
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required"
  }
}
```

## Códigos de Erro
- `AUTH_ERROR` (401) - API key inválida
- `VALIDATION_ERROR` (400) - Dados inválidos
- `NOT_FOUND` (404) - Recurso não encontrado
- `CONFLICT` (409) - Conflito (ex: tag duplicada)
- `INTERNAL_ERROR` (500) - Erro interno
