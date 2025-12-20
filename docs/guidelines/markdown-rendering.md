# Markdown Rendering Guidelines

## 📋 Regra de Ouro

> **SEMPRE** que renderizar markdown, o scroll deve estar **DENTRO** do conteúdo markdown, NUNCA no container externo (modal, página, etc.)

---

## ✅ Implementação Correta

### Container de Preview

```tsx
<div className="overflow-auto max-h-[60vh]">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>
```

**Características:**
- ✅ Container tem `max-h-[60vh]` para limitar altura
- ✅ Container tem `overflow-auto` para scroll vertical/horizontal quando necessário
- ✅ Modal/Container externo **NÃO** tem scroll
- ✅ Largura e altura generosas para boa legibilidade

### Componentes Internos com Scroll

Elementos que podem ter conteúdo largo devem ter scroll próprio:

```tsx
// Tabelas
table: ({ node, ...props }) => (
  <div className="my-6 w-full overflow-x-auto">
    <table className="w-full" {...props} />
  </div>
)

// Blocos de código
code: (props) => {
  if (isInline) return <code>{children}</code>;
  
  return (
    <div className="overflow-x-auto rounded-lg bg-muted p-4">
      <code className="font-mono text-sm">{children}</code>
    </div>
  );
}
```

---

## ❌ Erros Comuns

### ❌ Scroll na Modal

```tsx
// ERRADO - Modal com scroll horizontal
<DialogContent className="overflow-auto">
  <ReactMarkdown>{content}</ReactMarkdown>
</DialogContent>
```

**Problema:** A modal inteira fica com scroll, quebrando o layout.

### ❌ Sem Limitação de Altura

```tsx
// ERRADO - Sem max-height
<div className="overflow-auto">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>
```

**Problema:** Pode expandir infinitamente e quebrar o layout vertical.

### ❌ Tabelas sem Scroll Próprio

```tsx
// ERRADO - Tabela grande quebra layout
table: ({ ...props }) => <table {...props} />
```

**Problema:** Tabelas largas estouram o container.

---

## 🎯 Checklist de Implementação

Ao criar/editar componentes com markdown:

- [ ] Container de preview tem `max-h-[60vh]` ou altura adequada
- [ ] Container de preview tem `overflow-auto`
- [ ] Tabelas têm wrapper com `overflow-x-auto`
- [ ] Blocos de código têm `overflow-x-auto`
- [ ] Modal/Container pai **NÃO** tem scroll horizontal
- [ ] Testado com conteúdo grande (ex: schema de database)

---

## 📍 Locais de Uso

### Implementado Corretamente

1. **`MarkdownEditor`** (`src/components/ui/markdown-editor.tsx`)
   - Preview: `max-h-[60vh] overflow-auto`
   - Tabelas: wrapper com `overflow-x-auto`
   - Código: div com `overflow-x-auto`

2. **Document Viewer Page** (`src/app/(dashboard)/projects/[id]/docs/[docId]/page.tsx`)
   - Full page com `prose` styling
   - Componentes customizados com scroll

### A Verificar

- [ ] Outros componentes que renderizam markdown
- [ ] Campos de descrição em features/epics/tasks

---

## 🔧 Template de Componente

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownViewer({ content }: { content: string }) {
  return (
    <div className="overflow-auto max-h-[60vh] p-4 rounded-md border">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ node, ...props }) => (
            <div className="my-6 w-full overflow-x-auto">
              <table className="w-full" {...props} />
            </div>
          ),
          code: (props: any) => {
            const isInline = !props.className?.includes('language-');
            return isInline ? (
              <code className="bg-muted px-1 py-0.5 rounded">{props.children}</code>
            ) : (
              <div className="overflow-x-auto rounded-lg bg-muted p-4 my-4">
                <code className="font-mono text-sm">{props.children}</code>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

---

## 📚 Referências

- [react-markdown](https://github.com/remarkjs/react-markdown)
- [remark-gfm](https://github.com/remarkjs/remark-gfm) (tables, strikethrough, etc.)
- Tailwind Classes: `overflow-auto`, `max-h-[60vh]`, `overflow-x-auto`

---

**Última atualização:** 2025-12-19  
**Autor:** Sistema de Guidelines
