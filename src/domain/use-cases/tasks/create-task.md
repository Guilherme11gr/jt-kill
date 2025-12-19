# Create Task Use Case

Cria uma nova tarefa dentro de uma feature.

## Input
```typescript
{
  orgId: string;
  featureId: string;
  title: string;
  description?: string | null;
  type?: TaskType;
  priority?: TaskPriority;
  points?: StoryPoints | null;
  module?: string | null;
  assigneeId?: string | null;
}
```

## Output
Retorna o objeto `Task` criado.

## Regras de Negócio
- `local_id` é gerado automaticamente pelo banco de dados (sequencial por projeto).
- `project_id` é propagado automaticamente (geralmente via trigger ou query no repositório).
- Status inicial padrão é 'TODO' (ou similar).
