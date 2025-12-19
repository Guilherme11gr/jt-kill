# Create Feature Use Case

Cria uma nova feature dentro de um épico.

## Input
```typescript
{
  orgId: string;
  epicId: string;
  title: string;
  description?: string | null;
}
```

## Output
Retorna o objeto `Feature` criado.

## Regras de Negócio
- A feature é criada com status inicial padrão (geralmente 'OPEN' ou similar).
