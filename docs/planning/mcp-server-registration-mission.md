# 🤖 Missão: Registrar Feature MCP Server no JT-Kill

## Contexto

Foi implementado um **MCP Server completo** para a Agent API do JT-Kill. Este documento contém instruções para registrar essa implementação no próprio sistema usando as tools do MCP.

---

## 📋 Sua Missão

Usar as **tools do MCP `jt-kill`** para criar a estrutura completa no sistema:

1. Verificar se existe Epic de "Infraestrutura de Agents" ou similar
2. Se não existir, anotar para criar manualmente (epics são read-only na API)
3. Criar Feature "MCP Server para Agent API"
4. Criar Tasks (já concluídas) para histórico

---

## 🔧 Passo a Passo

### 1. Listar Projetos

```
Use tool: list_projects
```

Anote o `projectId` do projeto JT-Kill (provavelmente "JKILL").

### 2. Listar Epics

```
Use tool: list_epics
Filter: projectId = <id do passo 1>
```

Procure por epic relacionado a "Agents", "Infraestrutura", "Automação" ou "MCP".

Se não existir, o usuário precisará criar manualmente na UI (epics são read-only na API).

### 3. Criar Feature

```
Use tool: create_feature
```

**Dados:**
```json
{
  "title": "MCP Server para Agent API",
  "epicId": "<epic-id>",
  "description": "Implementação de servidor MCP (Model Context Protocol) que expõe a Agent API como tools para AI agents (Claude Desktop, VS Code Copilot, etc).\n\n## Objetivo\n\nPermitir que AI agents interajam com o JT-Kill de forma nativa, sem precisar fazer chamadas HTTP manuais.\n\n## Benefícios\n\n- **27 tools** cobrindo 100% da Agent API\n- **Context injection** automático via resources\n- **Audit trail** com _metadata em todas mutações\n- **Zero breaking changes** - MCP é camada adicional sobre REST API existente\n\n## Stack\n\n- `@modelcontextprotocol/sdk` - SDK oficial\n- TypeScript com tipos completos\n- Stdio transport (padrão MCP)\n\n## Estrutura\n\n```\nmcp-server/\n├── src/\n│   ├── index.ts      # Server entry point\n│   ├── tools.ts      # 27 tool definitions\n│   ├── handlers.ts   # Tool handlers\n│   └── api-client.ts # HTTP client wrapper\n├── package.json\n├── tsconfig.json\n└── README.md\n```",
  "status": "DONE"
}
```

### 4. Criar Tasks (Histórico)

Após criar a feature, crie as seguintes tasks com status `DONE`:

---

#### Task 1: Setup inicial do MCP Server

```
Use tool: create_task
```

```json
{
  "title": "Setup inicial do MCP Server",
  "featureId": "<feature-id-criado>",
  "priority": "HIGH",
  "status": "DONE",
  "description": "Criar estrutura base do MCP Server standalone.\n\n---\n## Implementação Realizada\n\n**Arquivos criados:**\n- `mcp-server/package.json` - Dependências e scripts\n- `mcp-server/tsconfig.json` - Configuração TypeScript\n- `mcp-server/src/index.ts` - Entry point com stdio transport\n- `mcp-server/src/api-client.ts` - Cliente HTTP reutilizável\n- `mcp-server/.gitignore` - Ignora node_modules, dist, .env\n\n**Dependências:**\n- `@modelcontextprotocol/sdk` - SDK oficial MCP\n- `tsx` - Dev runner\n- `typescript` - Compilação\n\n**Scripts:**\n- `npm run build` - Compila para dist/\n- `npm run dev` - Roda em modo dev\n- `npm start` - Roda build\n\n## Quality Gates\n\n- TypeScript: ✅ PASS\n- Build: ✅ PASS"
}
```

---

#### Task 2: Implementar API Client

```
Use tool: create_task
```

```json
{
  "title": "Implementar API Client wrapper",
  "featureId": "<feature-id-criado>",
  "priority": "MEDIUM",
  "status": "DONE",
  "description": "Criar cliente HTTP centralizado para chamadas à Agent API.\n\n---\n## Implementação Realizada\n\n**Arquivo criado:**\n- `mcp-server/src/api-client.ts` (~100 linhas)\n\n**Features:**\n- `apiRequest<T>()` - Função genérica com tipos\n- Auto-inject de `Authorization: Bearer` header\n- Auto-inject de `_metadata` em mutações (source: mcp, agentName)\n- Query params builder (filtra undefined/null)\n- Error handling com `ApiError` class\n- `formatResponse()` - Formata output para MCP\n- `formatError()` - Formata erros para MCP\n\n**Configuração via ENV:**\n- `AGENT_API_KEY` (required)\n- `AGENT_API_URL` (default: https://jt-kill.vercel.app/api/agent)\n- `AGENT_USER_ID` (optional, para comentários)\n- `AGENT_NAME` (default: Claude-MCP)\n\n## Quality Gates\n\n- TypeScript: ✅ PASS"
}
```

---

#### Task 3: Definir Tool Schemas (27 tools)

```
Use tool: create_task
```

```json
{
  "title": "Definir schemas das 27 tools",
  "featureId": "<feature-id-criado>",
  "priority": "HIGH",
  "status": "DONE",
  "description": "Criar definições completas de todas as tools MCP.\n\n---\n## Implementação Realizada\n\n**Arquivo criado:**\n- `mcp-server/src/tools.ts` (~400 linhas)\n\n**Tools implementadas (27 total):**\n\n### Tasks (9 tools)\n- `list_tasks` - 13 filtros (status, feature, epic, blocked, search, etc)\n- `get_task` - Por UUID ou readable ID (JKILL-123)\n- `create_task` - Com featureId obrigatório\n- `update_task` - Status, description, priority, etc\n- `delete_task` - ⚠️ Danger\n- `bulk_update_tasks` - Múltiplas de uma vez\n- `block_tasks` - Bloquear/desbloquear em massa\n- `add_task_comment` - Comentários markdown\n- `list_task_comments` - Listar comentários\n\n### Features (5 tools)\n- `list_features`, `get_feature`, `create_feature`, `update_feature`, `delete_feature`\n\n### Epics (3 tools)\n- `list_epics`, `get_epic`, `get_epic_full` (⭐ agregado)\n\n### Projects (1 tool)\n- `list_projects`\n\n### Docs (5 tools)\n- `list_docs`, `get_doc`, `create_doc`, `update_doc`, `delete_doc`\n\n### Tags (4 tools)\n- `list_tags`, `get_tag`, `create_tag`, `delete_tag`\n\n**Cada tool inclui:**\n- `name` - Identificador único\n- `description` - Documentação rica com casos de uso\n- `inputSchema` - JSON Schema completo com tipos e enums\n\n## Quality Gates\n\n- TypeScript: ✅ PASS"
}
```

---

#### Task 4: Implementar Handlers

```
Use tool: create_task
```

```json
{
  "title": "Implementar handlers para todas as tools",
  "featureId": "<feature-id-criado>",
  "priority": "HIGH",
  "status": "DONE",
  "description": "Criar handlers que executam as chamadas à API.\n\n---\n## Implementação Realizada\n\n**Arquivo criado:**\n- `mcp-server/src/handlers.ts` (~350 linhas)\n\n**Estrutura:**\n- 1 handler function por tool\n- Router `TOOL_HANDLERS` mapeando name → function\n- Auto-extract de `changeReason` para `_metadata`\n- Formatação consistente de responses\n\n**Padrão de cada handler:**\n```typescript\nasync function handleXxx(args: ToolArgs): Promise<string> {\n  try {\n    const response = await apiRequest(...);\n    return formatResponse(response.data, 'Summary');\n  } catch (error) {\n    return formatError(error as ApiError);\n  }\n}\n```\n\n**Handlers especiais:**\n- `handleGetEpicFull` - Usa endpoint agregado /epics/:id/full\n- `handleAddTaskComment` - Injeta AGENT_USER_ID\n- `handleBulkUpdateTasks` - Separa ids de update fields\n\n## Quality Gates\n\n- TypeScript: ✅ PASS"
}
```

---

#### Task 5: Configurar VS Code MCP

```
Use tool: create_task
```

```json
{
  "title": "Configurar MCP para VS Code Copilot",
  "featureId": "<feature-id-criado>",
  "priority": "MEDIUM",
  "status": "DONE",
  "description": "Criar configuração para usar MCP Server no VS Code.\n\n---\n## Implementação Realizada\n\n**Arquivos criados:**\n- `.vscode/mcp.json` - Config para VS Code\n- `mcp-server/claude_desktop_config.json` - Config para Claude Desktop\n\n**VS Code config (.vscode/mcp.json):**\n```json\n{\n  \"servers\": {\n    \"jt-kill\": {\n      \"command\": \"node\",\n      \"args\": [\"<path>/mcp-server/dist/index.js\"],\n      \"env\": {\n        \"AGENT_API_KEY\": \"agk_xxx\",\n        \"AGENT_USER_ID\": \"uuid\",\n        \"AGENT_API_URL\": \"http://localhost:3005/api/agent\"\n      }\n    }\n  }\n}\n```\n\n**Como habilitar:**\n1. Reload VS Code\n2. MCP: List Servers → jt-kill deve aparecer Running\n3. Accounts: Manage Trusted MCP Servers → Trust jt-kill\n4. Nova sessão de chat para tools ficarem disponíveis\n\n## Quality Gates\n\n- Server: ✅ Running (27 tools discovered)"
}
```

---

#### Task 6: Documentação

```
Use tool: create_task
```

```json
{
  "title": "Criar documentação completa do MCP Server",
  "featureId": "<feature-id-criado>",
  "priority": "MEDIUM",
  "status": "DONE",
  "description": "Documentar setup, uso e troubleshooting.\n\n---\n## Implementação Realizada\n\n**Arquivo criado:**\n- `mcp-server/README.md` (~200 linhas)\n\n**Seções:**\n1. Quick Start (install, build, config)\n2. Tools Disponíveis (tabela com 27 tools)\n3. Exemplos de Uso (prompts naturais)\n4. Desenvolvimento (dev mode, env vars)\n5. Resources (API schema)\n6. Troubleshooting (erros comuns)\n\n**Exemplos de uso documentados:**\n- \"Liste minhas tasks em DOING\"\n- \"Me dê o contexto completo do epic X\"\n- \"Crie uma task na feature Y\"\n- \"Mova JKILL-123 para DONE\"\n- \"Bloqueie as tasks X e Y\"\n\n## Quality Gates\n\n- Markdown: ✅ Válido\n- Links: ✅ Funcionando"
}
```

---

### 5. Adicionar Comentário na Feature

Após criar todas as tasks:

```
Use tool: update_feature
```

```json
{
  "id": "<feature-id>",
  "status": "DONE"
}
```

---

## ✅ Checklist Final

- [ ] Projeto identificado
- [ ] Epic identificado/anotado
- [ ] Feature criada com descrição rica
- [ ] 6 tasks criadas com status DONE
- [ ] Feature marcada como DONE

---

## 📝 Notas

- Todas as tasks devem ser criadas com `status: "DONE"` pois já foram implementadas
- Use `assigneeId: "b7d65a91-7cb6-4583-b46d-4f64713ffae2"` (Gepeto/Copilot)
- O `_metadata` é injetado automaticamente pelo MCP Server
- Se o MCP não funcionar, pode usar a REST API diretamente seguindo [docs/jira-killer-api.md](docs/jira-killer-api.md)

---

## 🎉 Resultado Esperado

Após executar todos os passos, o JT-Kill terá registro completo da implementação do MCP Server com:
- 1 Feature documentada
- 6 Tasks com descrições ricas de implementação
- Histórico completo para referência futura
