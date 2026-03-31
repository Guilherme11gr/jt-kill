# Fix: XSS via javascript: URIs no MarkdownViewer

## Goal

Corrigir vulnerabilidade XSS na pagina publica de docs. O componente `MarkdownViewer` propaga `href` sem sanitizar, permitindo `javascript:alert(document.cookie)` via markdown.

## Contexto

- **Arquivo**: `src/components/ui/markdown-viewer.tsx`
- **Problema**: O componente custom `<a>` faz `{...props}` sem filtrar o `href`
- `react-markdown` + `remark-gfm` nao sanitizam URIs por padrao
- A pagina publica (`/shared/docs/[token]`) renderiza conteudo de qualquer doc marcada como `isPublic=true`
- Quem cria o doc ja esta autenticado, mas se o conteudo vier de AI ou import, pode conter links maliciosos

## Abordagem

Sanitizar `href` no componente `a` do MarkdownViewer. Bloquear protocolos perigosos (`javascript:`, `data:`, `vbscript:`, etc) e so permitir HTTP/HTTPS/mailto/tel.

## Plano

### Step 1: Criar utilitario de sanitizacao

**Arquivo**: `src/shared/utils/sanitize-url.ts` (novo)

```ts
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

export function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  const trimmed = url.trim();
  const colonIndex = trimmed.indexOf(':');

  // Se nao tem protocolo (link relativo), permite
  if (colonIndex === -1) return trimmed;

  const protocol = trimmed.slice(0, colonIndex + 1).toLowerCase();

  if (ALLOWED_PROTOCOLS.has(protocol)) return trimmed;

  // Protocolo nao permitido -- retorna # para neutralizar
  return undefined;
}
```

Allowlist e mais seguro que blocklist (evita bypass com encoding, espacos, etc).

### Step 2: Aplicar no MarkdownViewer

**Arquivo**: `src/components/ui/markdown-viewer.tsx`

Trocar:
```tsx
a: ({ node, ...props }) => <a className="..." {...props} />
```

Por:
```tsx
a: ({ node, href, ...props }) => (
  <a className="..." href={sanitizeUrl(href)} target="_blank" rel="noopener noreferrer" {...props} />
)
```

- `sanitizeUrl(href)` retorna `undefined` se protocolo perigoso, removendo o href
- `target="_blank"` + `rel="noopener noreferrer"` protege contra tabnabbing em links externos

### Step 3: Validar com typecheck

```bash
npx tsc --noEmit
```

### Step 4: Commit e push

```
fix: sanitize URLs in MarkdownViewer to prevent XSS
```

## Arquivos modificados

| Arquivo | Acao |
|---------|------|
| `src/shared/utils/sanitize-url.ts` | Criar |
| `src/components/ui/markdown-viewer.tsx` | Editar (import + componente `a`) |

## Testes manuais a fazer

1. Criar doc com `[click](javascript:alert(1))` no markdown -- link nao deve ter href
2. Criar doc com `[click](data:text/html,<script>alert(1)</script>)` -- link nao deve ter href
3. Link normal `[site](https://google.com)` -- deve funcionar
4. Link relativo `[page](/dashboard)` -- deve funcionar
5. Link mailto `[email](mailto:test@test.com)` -- deve funcionar
6. Verificar que a pagina publica renderiza corretamente

## Riscos

- **Baixo** -- mudança pontual, sem impacto em funcionalidade existente
- Links com protocolos exoticos mas legitimos (ex: `ftp:`) serao bloqueados. Se precisar, so adicionar ao allowlist
- `target="_blank"` muda comportamento de links internos -- mas na pagina publica todos links sao "externos" ao contexto do doc

## Nao fazer

- Nao adicionar dependencias externas (DOMPurify, sanitize-html) -- overkill pra esse caso
- Nao mudar o `ReactMarkdown` ou `remark-gfm` -- nao e responsabilidade deles
