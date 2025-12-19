# Get Epic By ID Use Case

Busca um épico pelo seu ID e ID da organização.

## Input
- `id`: ID do épico.
- `orgId`: ID da organização.

## Output
Retorna o objeto `Epic` encontrado.

## Erros
- `NotFoundError`: Se o épico não for encontrado ou não pertencer à organização.
