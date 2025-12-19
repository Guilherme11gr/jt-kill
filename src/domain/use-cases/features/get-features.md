# Get Features Use Case

Retorna todas as features de um épico, incluindo estatísticas (contagem de tasks).

## Input
- `epicId`: ID do épico.
- `orgId`: ID da organização.

## Output
Retorna uma lista de objetos `Feature` com a propriedade `_count` contendo o número de tasks.

## Regras de Negócio
- Retorna as features associadas ao épico especificado.
