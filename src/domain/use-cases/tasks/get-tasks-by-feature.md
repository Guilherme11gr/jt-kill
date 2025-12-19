# Get Tasks By Feature Use Case

Retorna todas as tarefas de uma feature.

## Input
- `featureId`: ID da feature.
- `orgId`: ID da organização.

## Output
Retorna uma lista de objetos `TaskWithReadableId` (inclui o ID legível, ex: PROJ-123).

## Regras de Negócio
- Retorna as tarefas associadas à feature especificada.
