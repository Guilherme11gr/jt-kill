# Update Task Use Case

Atualiza os dados de uma tarefa.

## Input
- `id`: ID da tarefa.
- `orgId`: ID da organização.
- `input`:
  ```typescript
  {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    type?: TaskType;
    priority?: TaskPriority;
    points?: StoryPoints | null;
    module?: string | null;
    assigneeId?: string | null;
  }
  ```

## Output
Retorna o objeto `Task` atualizado.

## Regras de Negócio
- A tarefa deve existir e pertencer à organização.

## Erros
- `NotFoundError`: Se a tarefa não for encontrada.
