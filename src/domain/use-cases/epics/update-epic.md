# Update Epic Use Case

Atualiza um épico existente.

## Input
- `id`: ID do épico.
- `orgId`: ID da organização.
- `input`:
  ```typescript
  {
    title?: string;
    description?: string | null;
    status?: EpicStatus;
  }
  ```

## Output
Retorna o objeto `Epic` atualizado.

## Regras de Negócio
- O épico deve existir e pertencer à organização.

## Erros
- `NotFoundError`: Se o épico não for encontrado.
