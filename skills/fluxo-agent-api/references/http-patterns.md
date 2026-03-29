# Fluxo Agent API Patterns

## Required envs

Add these variables to the consumer repo's `.env.local`:

```dotenv
FLUXO_AGENT_KEY=agk_your_tenant_key_here
FLUXO_AGENT_API_URL=https://your-host/api/agent
FLUXO_AGENT_NAME=Codex Skill
```

- `FLUXO_AGENT_KEY`: required.
- `FLUXO_AGENT_API_URL`: optional; defaults to `http://localhost:3005/api/agent`.
- `FLUXO_AGENT_NAME`: optional; defaults to `Codex Skill`.

## Query examples

List projects:

```bash
python scripts/fluxo_api.py request GET /projects --pretty
```

List tasks in progress:

```bash
python scripts/fluxo_api.py curl GET /tasks \
  --query status=DOING \
  --query limit=10
```

Get the live API schema:

```bash
python scripts/fluxo_api.py request GET / --pretty
```

## Mutation payload examples

Create task:

```json
{
  "title": "Ajustar trilha de auditoria do agent",
  "featureId": "uuid-da-feature",
  "description": "Detalhes em markdown",
  "_metadata": {
    "changeReason": "Criada por automação do agent"
  }
}
```

Update task:

```json
{
  "status": "REVIEW",
  "_metadata": {
    "changeReason": "Implementação concluída"
  }
}
```

Block tasks:

```json
{
  "ids": ["uuid-1", "uuid-2"],
  "blocked": true,
  "_metadata": {
    "changeReason": "Dependência externa pendente"
  }
}
```

## Notes

- Use IDs UUID on direct API calls.
- The API accepts `X-Agent-Name`; the helper sends it automatically.
- If the server returns `410` on `/api/kai` or `/api/luna`, those routes were intentionally retired.
