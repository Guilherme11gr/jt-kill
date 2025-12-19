# Delete Feature Use Case

Exclui uma feature e todos os seus dados relacionados (Cascade Delete).

## Input
- `id`: ID da feature.
- `orgId`: ID da organização.

## Output
`void` (Promise).

## Regras de Negócio
- **Cascade Delete**: A exclusão da feature deve remover em cascata:
  - Tasks
  (Isso é geralmente garantido pela constraint do banco de dados ou implementação do repositório).

## Erros
- `NotFoundError`: Se a feature não for encontrada ou não pertencer à organização.
