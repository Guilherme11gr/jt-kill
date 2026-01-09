# Refine Text Use Case

Use-case para **refinar** texto existente, focando em qualidade de escrita, gramática e formatação markdown.

## Diferença vs Improve Description

| Feature | Refine Text | Improve Description |
|---------|-------------|---------------------|
| **Objetivo** | Melhorar escrita do texto atual | Gerar descrição completa com contexto |
| **Input** | Apenas o texto | Texto + feature + docs do projeto |
| **Output** | Versão refinada do texto | Nova descrição baseada em contexto |
| **Temperatura** | 0.3 (conservador) | 0.7 (criativo) |
| **Uso** | Polir texto rápido | Gerar descrição estruturada |

## Propósito

Corrigir e melhorar texto existente **SEM** adicionar informações novas ou contexto externo.

## Input

```typescript
{
  text: string;           // Texto a ser refinado
  context?: string;       // Opcional: "descrição de task", "descrição de feature"
}
```

## Output

```typescript
string // Texto refinado (gramática, clareza, markdown)
```

## Comportamento

1. **Recebe** texto bruto
2. **Envia prompt** para IA com foco em refinamento (não em geração)
3. **Retorna** versão melhorada

## Melhorias aplicadas

- ✅ Correção de gramática e ortografia
- ✅ Clareza e objetividade
- ✅ Formatação markdown (listas, negrito, `código`)
- ✅ Estruturação de informações
- ❌ **NÃO adiciona** informações novas
- ❌ **NÃO busca** contexto externo

## Exemplo

**Antes:**
```
implementar login com email e senha, validar campos e mostrar erros
```

**Depois:**
```
Implementar autenticação por email e senha:

- Validar formato de email
- Validar senha (mínimo 8 caracteres)
- Exibir mensagens de erro específicas
- Redirecionar para `/dashboard` após sucesso
```

## Dependências

- `aiAdapter`: Instância do AIAdapter configurado para DeepSeek

## Configuração

- **Temperatura**: 0.3 (conservador - mantém fidelidade ao original)
- **Max tokens**: 2000
- **Modelo**: `deepseek-chat` (default)

## Casos de Uso

1. **Task Dialog** - Botão "Refinar" ao lado do textarea
2. **Feature Dialog** - Refinar descrição rapidamente
3. **Epic Dialog** - Polir texto sem perder contexto
4. **Markdown Preview** - Melhorar formatação antes de salvar
