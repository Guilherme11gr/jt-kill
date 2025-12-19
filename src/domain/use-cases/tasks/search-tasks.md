# Search Tasks Use Case

Busca tarefas com filtros e paginação.

## Input
- `orgId`: ID da organização.
- `filters`:
  ```typescript
  {
    page?: number;
    pageSize?: number;
    status?: TaskStatus;
    assigneeId?: string;
    // outros filtros suportados pelo repositório
  }
  ```

## Output
```typescript
{
  items: TaskWithReadableId[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

## Regras de Negócio
- Executa a busca (`findMany`) e a contagem (`count`) em paralelo para performance.
- Calcula `totalPages` baseado no `total` e `pageSize`.
