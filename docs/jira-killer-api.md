# JT-Kill Agent API

## Autenticação

Todas as rotas (exceto `/api/agent`) requerem header:
```
Authorization: Bearer agk_xxxxxxxxxxxxx
Use as seguintes credenciais:
AGENT_API_KEY=agk_5f8d2e1b9c3a4b7d8e9f0a1b2c3d4e5f
AGENT_ORG_ID=11111111-1111-1111-1111-111111111111
ASSIGNEE_ID=b7d65a91-7cb6-4583-b46d-4f64713ffae2
USER_ID=b7d65a91-7cb6-4583-b46d-4f64713ffae2
```

## Base URL
```
https://jt-kill.vercel.app/api/agent
```

---

## 🤖 Instruções para AI Agents

### Fluxo de Trabalho com Tasks

Ao executar uma task do projeto:

1. **Puxar a Task**: Buscar task por ID ou listar tasks do epic/feature
2. **Mover para DOING**: Atualizar status para `DOING` e adicionar `assigneeId`
3. **Executar o Trabalho**: Implementar o que a task pede
4. **Atualizar Descrição**: Adicionar detalhes do que foi implementado
5. **🔴 QUALITY GATE OBRIGATÓRIO**: Antes de mover para REVIEW/DONE, rodar:
   - `npm run build` - Build deve passar ✅
   - `npm test` - Testes devem passar ✅
   - `npm run typecheck` - Typecheck deve passar ✅
6. **Mover para REVIEW**: Atualizar status para `REVIEW` (somente após quality gate)

### 🔴 REGRA CRÍTICA: Quality Gate

**NUNCA** mover uma task para `REVIEW` ou `DONE` sem antes executar e confirmar:

```bash
npm run build && npm test && npm run typecheck
```

Se qualquer um falhar:
1. **Corrija o problema** antes de atualizar o status
2. **Documente na descrição** se houver falha pré-existente não relacionada
3. **Só passe adiante** quando os 3 comandos passarem

Isso garante que o código entregue está sempre em estado funcional.

### 📋 REGRA: Code Review de Tasks em REVIEW

Quando houver tasks em status `REVIEW`:

1. **Puxar todas as tasks em REVIEW**:
   ```bash
   GET /api/agent/tasks?status=REVIEW&assigneeId=b7d65a91-7cb6-4583-b46d-4f64713ffae2
   ```

2. **Analisar cada task e decidir**:

   **a) Se tiver CRITICAL ISSUES** (bugs graves, código quebrado, segurança):
   - Adicionar comentário detalhando os problemas
   - **Bloquear a task**: `PATCH` com `"blocked": true`
   - Exemplo:
     ```json
     {
       "blocked": true,
       "description": "[descrição original]\n\n---\n## ⚠️ BLOQUEADO - Code Review\n\n**Issues críticos encontrados:**\n- [Detalhe do problema 1]\n- [Detalhe do problema 2]"
     }
     ```

   **b) Se for feature com UI/UX** (necessita validação visual):
   - Adicionar comentário: "✅ Code review OK. Pronto para QA visual."
   - **Manter em REVIEW** ou criar tag/label indicando "Ready for QA"
   - Não mover para DONE sem teste visual

   **c) Se for simples e sem UI** (refactor, fix, função pura, testes):
   - Validar que quality gate passou
   - Adicionar comentário: "✅ Code review aprovado. Quality gate OK."
   - **Mover direto para DONE**: `PATCH` com `"status": "DONE"`

3. **Sempre adicionar comentário** explicando a decisão, mesmo quando aprovar.

### 🎯 Fluxo de Conclusão: REVIEW → Status Final

Após Code Review, mover tasks para status final seguindo estas regras:

| Tipo de Task | Condição | Ação |
|--------------|----------|------|
| **Código/Backend** | Quality gate OK, sem UI | → `DONE` direto |
| **Testes** | Testes passando | → `DONE` direto |
| **Helpers/Utils** | Funções puras testadas | → `DONE` direto |
| **UI/UX** | Precisa validação visual | → `DONE` + comentário "Ready for QA visual" |
| **Bugfix** | Fix verificável por teste | → `DONE` direto |
| **Feature complexa** | Múltiplas partes integradas | → `DONE` + comentário "Pronto para smoke test" |
| **Com issues críticos** | Bugs graves encontrados | → `blocked: true` + comentário detalhado |

**Exemplos de comentário ao mover para DONE:**

```markdown
## ✅ Aprovado para DONE

**Quality Gate:**
- Build: ✅ PASS
- Tests: ✅ PASS (32 passing)
- TypeCheck: ✅ PASS

**Validação:**
- [x] Código auditado
- [x] Testes cobrindo cenários principais
- [x] Sem breaking changes

**Nota:** Pronto para smoke test visual em /admin-tour
```

**Exemplo de bloqueio:**

```markdown
## ❌ BLOQUEADO

**Issues Críticos:**
1. Redirect loop em cenário X (ver linha Y)
2. Memory leak no cache (não limpa após TTL)

**Próximos passos:**
- Corrigir issues listados
- Re-executar quality gate
- Submeter para novo review
```

### Ao Atualizar uma Task (PATCH)

Sempre incluir:
- `status`: Novo status da task
- `assigneeId`: `"b7d65a91-7cb6-4583-b46d-4f64713ffae2"` (Gepeto)
- `description`: Atualizar com detalhes da implementação

### 📋 Formato da Descrição Atualizada (OBRIGATÓRIO)

Ao finalizar uma task, **SEMPRE** enriqueça a descrição com detalhes completos.
Isso cria histórico valioso para rastreabilidade e aprendizado.

```markdown
[Descrição original da task]

---
## Implementação Realizada

**Arquivos criados:**
- `path/to/file.ts` - Descrição breve
- `path/to/file.test.ts` (X testes)

**Arquivos modificados:**
- `path/to/existing.ts` - O que foi alterado

## Cobertura de Testes

- Casos de sucesso (cenário A, B, C)
- Erros (validação, not found, conflito)
- Edge cases (lista vazia, valores limite)
- Mapeamentos específicos (se aplicável)

## Problemas Encontrados e Corrigidos

- **Problema**: Descrição do problema encontrado
  - **Causa**: Por que aconteceu
  - **Solução**: Como foi resolvido

## Quality Gates

- TypeScript: ✅ PASS
- ESLint: ✅ PASS  
- Jest: ✅ PASS (X testes)
```

### Exemplo Real (AGQ-77)

```markdown
Testar calculo de progresso, reenvio de link.

---
## Implementação Realizada

Criados 2 arquivos de teste:
- get-visitor-progress.test.ts (15 testes)
- resend-visitor-link.test.ts (9 testes)

## Cobertura

- Casos de sucesso (progresso misto, 100%, 0%)
- Erros (token inválido, status incorreto, link expirado)
- Edge cases (lista vazia, links expirados, voucher já gerado)
- Mapeamento de períodos (morning/afternoon/full_day)

## Problemas Encontrados e Corrigidos

- Interface VisitorLinkRepository precisou de novos métodos (markWhatsappSent, markReminderSent)
- Testes de F6 (complete-visitor-registration) atualizados para nova interface
- Type assertions necessários para visitorData parcial nos mocks

## Quality Gates

TypeScript, ESLint e Jest: todos passando.
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
- `status` (enum: BACKLOG, TODO, DOING, REVIEW, DONE, BLOCKED)
- `blocked` (boolean, opcional) - Filtrar apenas tasks bloqueadas
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
  "status": "BACKLOG | TODO | DOING | REVIEW | DONE | BLOCKED (default: BACKLOG)",
  "assigneeId": "uuid (optional)",
  "blocked": "boolean (default: false)"
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
  "status": "BACKLOG | TODO | DOING | REVIEW | DONE | BLOCKED",
  "assigneeId": "uuid | null",
  "blocked": "boolean"
}
```

**Nota:** Ao mover tasks para DOING/REVIEW/DONE, sempre incluir `assigneeId` do responsável.

### Deletar Task
```
DELETE /api/agent/tasks/:id
```

---

## Comentários em Tasks

### Adicionar Comentário
```
POST /api/agent/tasks/:id/comments
```
Body:
```json
{
  "content": "string (required, markdown)",
  "userId": "uuid (required - usar o ASSIGNEE_ID do Gepeto)"
}
```

**Exemplo:**
```bash
curl -X POST "https://jt-kill.vercel.app/api/agent/tasks/TASK_ID/comments" \
  -H "Authorization: Bearer agk_5f8d2e1b9c3a4b7d8e9f0a1b2c3d4e5f" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Code review concluído. Todos os testes passando.",
    "userId": "b7d65a91-7cb6-4583-b46d-4f64713ffae2"
  }'
```

### Listar Comentários de uma Task
```
GET /api/agent/tasks/:id/comments
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
Body (todos opcionais):
```json
{
  "title": "string",
  "description": "string",
  "status": "BACKLOG | TODO | DOING | DONE"
}
```

### Deletar Feature
```
DELETE /api/agent/features/:id
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

---

## Modelos de Dados

### Task Object
```json
{
  "id": "uuid",
  "readableId": "APP-123",
  "localId": 123,
  "title": "string",
  "description": "string | null",
  "status": "BACKLOG | TODO | DOING | REVIEW | DONE",
  "type": "TASK | BUG",
  "priority": "LOW | MEDIUM | HIGH | CRITICAL",
  "blocked": false,
  "statusChangedAt": "ISO date",
  "points": "number | null",
  "modules": ["string"],
  "featureId": "uuid",
  "projectId": "uuid",
  "orgId": "uuid",
  "assigneeId": "uuid | null",
  "createdBy": "uuid | null",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "tagAssignments": [],
  "tags": [
    { "id": "uuid", "name": "string", "color": "hex" }
  ],
  "assignee": {
    "id": "uuid",
    "displayName": "string",
    "avatarUrl": "url | null"
  },
  "feature": {
    "id": "uuid",
    "title": "string",
    "epic": {
      "id": "uuid",
      "title": "string",
      "project": {
        "id": "uuid",
        "key": "string",
        "name": "string"
      }
    }
  },
  "project": {
    "id": "uuid",
    "key": "string",
    "name": "string"
  }
}
```

### Feature Object
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string | null",
  "status": "BACKLOG | TODO | DOING | DONE",
  "health": "healthy | warning | critical | null",
  "healthUpdatedAt": "ISO date | null",
  "healthReason": "string | null",
  "epicId": "uuid",
  "orgId": "uuid",
  "isSystem": false,
  "createdBy": "uuid | null",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "epic": {
    "id": "uuid",
    "title": "string",
    "status": "OPEN | IN_PROGRESS | DONE",
    "project": {
      "id": "uuid",
      "key": "string",
      "name": "string"
    }
  },
  "tasks": [
    {
      "id": "uuid",
      "readableId": "APP-123",
      "title": "string",
      "status": "BACKLOG | TODO | DOING | REVIEW | DONE",
      "type": "TASK | BUG",
      "priority": "LOW | MEDIUM | HIGH | CRITICAL"
    }
  ]
}
```

### Epic Object
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string | null",
  "status": "OPEN | IN_PROGRESS | DONE",
  "projectId": "uuid",
  "orgId": "uuid",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "project": {
    "id": "uuid",
    "key": "string",
    "name": "string"
  },
  "features": [
    {
      "id": "uuid",
      "title": "string",
      "status": "BACKLOG | TODO | DOING | DONE"
    }
  ]
}
```

### Comment Object
```json
{
  "id": "uuid",
  "content": "string (markdown)",
  "taskId": "uuid",
  "userId": "uuid",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "user": {
    "id": "uuid",
    "displayName": "string",
    "avatarUrl": "url | null"
  }
}
```

### Doc Object
```json
{
  "id": "uuid",
  "title": "string",
  "content": "string (markdown)",
  "projectId": "uuid",
  "orgId": "uuid",
  "createdBy": "uuid | null",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "project": {
    "id": "uuid",
    "key": "string",
    "name": "string"
  }
}
```

### Tag Object
```json
{
  "id": "uuid",
  "name": "string",
  "color": "hex",
  "projectId": "uuid",
  "orgId": "uuid",
  "createdAt": "ISO date"
}
```
