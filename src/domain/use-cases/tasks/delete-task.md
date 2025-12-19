# Delete Task Use Case

Exclui uma tarefa.

## Input
- `id`: ID da tarefa.
- `orgId`: ID da organização.

## Output
`void` (Promise).

## Regras de Negócio
- A tarefa é removida permanentemente.

## Erros
- `NotFoundError`: Se a tarefa não for encontrada ou não pertencer à organização.
