# Update Task Status Use Case

Atualiza o status de uma tarefa.

## Input
- `id`: ID da tarefa.
- `orgId`: ID da organização.
- `newStatus`: Novo status (`TaskStatus`).

## Output
Retorna o objeto `Task` atualizado.

## Regras de Negócio
- A tarefa deve existir e pertencer à organização.
- Para o MVP, não há validação de transição de workflow (qualquer status é aceito).

## Erros
- `NotFoundError`: Se a tarefa não for encontrada.
