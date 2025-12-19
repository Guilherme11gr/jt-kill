# Delete Epic Use Case

Exclui um épico e todos os seus dados relacionados (Cascade Delete).

## Input
- `id`: ID do épico.
- `orgId`: ID da organização.

## Output
`void` (Promise).

## Regras de Negócio
- **Cascade Delete**: A exclusão do épico deve remover em cascata:
  - Features
  - Tasks
  (Isso é geralmente garantido pela constraint do banco de dados ou implementação do repositório).

## Erros
- `NotFoundError`: Se o épico não for encontrado ou não pertencer à organização.
