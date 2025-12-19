# Hierarquia Visual e Z-Index

Este documento define o padrão estrito de hierarquia visual (z-index) para evitar problemas de sobreposição e inconsistências na interface do usuário do Jira Killer.

## Camadas de Z-Index

Adotamos uma abordagem semântica para z-index, definida no tema do Tailwind. Evite usar valores numéricos arbitrários (como `z-50`, `z-[999]`).

| Classe Tailwind | Valor CSS | Uso | Componentes Típicos |
| :--- | :--- | :--- | :--- |
| `z-sticky` | `40` | Elementos fixos no fluxo da página | Headers sticky, Filtros fixos |
| `z-fixed` | `50` | Elementos fixos na tela (nível baixo) | Sidebar fixa, Botões flutuantes |
| `z-modal` | `100` | Modais e Overlays de tela cheia | `Dialog`, `Sheet` (Sidebar overlay) |
| `z-popover` | `110` | Elementos flutuantes sobre modais | `Select`, `DropdownMenu`, `Popover`, `Combobox` |
| `z-toast` | `120` | Notificações de alerta máximo | `Toaster`, `Sonner`, `Tooltip` |

## Configuração do Tema

As variáveis são definidas em `src/app/globals.css` dentro do bloco `@theme inline`:

```css
@theme inline {
  /* ... */
  --z-index-sticky: 40;
  --z-index-fixed: 50;
  --z-index-modal: 100;
  --z-index-popover: 110;
  --z-index-toast: 120;
}
```

## Como Usar nos Componentes

Ao criar ou editar componentes de UI (`src/components/ui/*.tsx`), use sempre as classes semânticas.

### Exemplo: Modal (Dialog)
O conteúdo e o overlay do modal devem usar `z-modal`.

```tsx
// Correto
<DialogOverlay className="z-modal ..." />
<DialogContent className="z-modal ..." />

// Incorreto
<DialogContent className="z-50 ..." />
<DialogContent className="z-[100] ..." />
```

### Exemplo: Select / Dropdown
O conteúdo do select deve estar ACIMA do modal, portanto use `z-popover`.

```tsx
// Correto
<SelectContent className="z-popover ..." />

// Incorreto
<SelectContent className="z-50 ..." />
```

### Exemplo: Toasts e Tooltips
Devem estar sempre no topo da hierarquia visual.

```tsx
<Toaster className="z-toast ..." />
```

## Resolução de Conflitos

Se um elemento estiver aparecendo atrás de outro indevidamente:
1. Verifique a qual camada lógica cada elemento pertence.
2. Não tente "ganhar no grito" aumentando o z-index arbitrariamente (ex: `z-[9999]`).
3. Ajuste a classe semântica do componente. Se um Popover precisa estar acima de um Modal, ele deve ser `z-popover` e o Modal `z-modal`.

---
*Documento criado em: 19/12/2025*
