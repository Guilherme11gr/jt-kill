# Update Project Use Case

Atualiza um projeto existente.

## Input
- `id`: ID do projeto.
- `orgId`: ID da organização.
- `input`:
  ```typescript
  {
    name?: string;
    description?: string | null;
    modules?: string[];
  }
  ```

## Output
Retorna o objeto `Project` atualizado.

## Regras de Negócio
1. **Imutabilidade da Chave**: A chave (`key`) do projeto não pode ser alterada.
2. **Unique Modules**: A lista de módulos não pode conter duplicatas.
3. **Existência**: O projeto deve existir e pertencer à organização.

## Erros
- `NotFoundError`: Se o projeto não for encontrado.
- `ValidationError`: Se houver módulos duplicados.
