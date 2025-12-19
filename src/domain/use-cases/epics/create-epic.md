# Create Epic Use Case

Cria um novo épico dentro de um projeto.

## Input
```typescript
{
  orgId: string;
  projectId: string;
  title: string;
  description?: string | null;
}
```

## Output
Retorna o objeto `Epic` criado.

## Regras de Negócio
- O épico é criado com status inicial padrão (geralmente 'OPEN' ou similar, definido pelo banco ou repositório).
