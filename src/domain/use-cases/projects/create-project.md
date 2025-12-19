# Create Project Use Case

Cria um novo projeto para uma organização.

## Input
```typescript
{
  orgId: string;
  name: string;
  key: string; // 2-10 chars, uppercase
  description?: string;
  modules?: string[];
}
```

## Output
Retorna o objeto `Project` criado.

## Regras de Negócio
1. **Key Format**: A chave do projeto deve ter entre 2 e 10 caracteres, apenas letras maiúsculas e números.
2. **Unique Modules**: A lista de módulos não pode conter duplicatas.
3. **Unique Key**: A chave deve ser única dentro da organização (garantido pelo banco).

## Erros
- `ValidationError`: Se a chave for inválida ou houver módulos duplicados.
