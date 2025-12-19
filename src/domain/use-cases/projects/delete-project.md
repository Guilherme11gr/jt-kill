# Delete Project Use Case

Exclui um projeto e todos os seus dados relacionados (Cascade Delete).

## Input
- `id`: ID do projeto.
- `orgId`: ID da organização.

## Output
`void` (Promise).

## Regras de Negócio
- **Cascade Delete**: A exclusão do projeto deve remover em cascata:
  - Epics
  - Features
  - Tasks
  - Comentários, sessões de poker, etc.
  (Isso é geralmente garantido pela constraint do banco de dados ou implementação do repositório).

## Erros
- `NotFoundError`: Se o projeto não for encontrado ou não pertencer à organização.
