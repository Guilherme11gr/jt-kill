# Get Project By ID Use Case

Busca um projeto pelo seu ID e ID da organização.

## Input
- `id`: ID do projeto.
- `orgId`: ID da organização.

## Output
Retorna o objeto `Project` encontrado.

## Erros
- `NotFoundError`: Se o projeto não for encontrado ou não pertencer à organização.
