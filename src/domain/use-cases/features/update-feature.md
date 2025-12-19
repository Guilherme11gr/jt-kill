# Update Feature Use Case

Atualiza uma feature existente.

## Input
- `id`: ID da feature.
- `orgId`: ID da organização.
- `input`:
  ```typescript
  {
    title?: string;
    description?: string | null;
    status?: FeatureStatus;
  }
  ```

## Output
Retorna o objeto `Feature` atualizado.

## Regras de Negócio
- A feature deve existir e pertencer à organização.

## Erros
- `NotFoundError`: Se a feature não for encontrada.
