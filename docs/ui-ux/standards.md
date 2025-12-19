---
tags: [ui-patterns, design-system, zinc-theme]
priority: high
last-updated: 2025-12-18
---

# 🎨 Design System & UX Standards

## 1. Identidade Visual (RefinaAI / Zinc Theme)

O projeto segue uma estética **minimalista, monocromática e profissional**, baseada no tema **Zinc** do Shadcn/UI.
O objetivo é eliminar ruído visual ("neon", "glow", sombras excessivas) e focar na hierarquia de informação.

### 🎨 Paleta de Cores (Semantic Variables)

**NUNCA** use cores hardcoded (ex: `bg-slate-900`, `text-blue-500`). Use **SEMPRE** as variáveis semânticas do CSS/Tailwind.

| Variável | Uso | Exemplo Tailwind |
|----------|-----|------------------|
| `--background` | Fundo da página | `bg-background` |
| `--card` | Fundo de cards/modais | `bg-card` |
| `--primary` | Ações principais, textos de destaque | `bg-primary`, `text-primary` |
| `--muted` | Elementos secundários, fundos sutis | `bg-muted` |
| `--muted-foreground` | Texto secundário, labels | `text-muted-foreground` |
| `--border` | Bordas sutis | `border-border` |
| `--destructive` | Ações de erro/perigo | `text-destructive` |

### Typography

- **Sans**: `Inter` (Interface geral)
- **Mono**: `JetBrains Mono` (IDs, código, dados técnicos)

```tsx
// ✅ Correto
<h1 className="text-3xl font-bold tracking-tight">Título</h1>
<p className="text-muted-foreground">Descrição</p>
<Badge className="font-mono">ID-123</Badge>

// ❌ Errado
<h1 className="text-slate-100">Título</h1>
<p className="text-gray-500">Descrição</p>
```

---

## 2. Layout & Espaçamento

### Grid & Spacing
- Base: **4px** (Tailwind default).
- Margins Padrão:
  - Mobile: `p-4`, `gap-4`
  - Desktop: `p-6` ou `p-8`, `gap-6`

### Responsividade (Mobile-First)
Todo componente deve ser pensado primeiro para telas pequenas (375px+).

- **Headings**: Use responsividade para evitar quebras.
  ```tsx
  <h1 className="text-2xl md:text-3xl font-bold">...</h1>
  ```
- **Grids**:
  ```tsx
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  ```
- **Botões**: Em mobile, garanta área de toque ou use `size="default"`/`size="lg"`. Evite botões muito pequenos.

---

## 3. Componentes Core

### Cards
- **Estilo**: Clean, sem sombra pesada, borda sutil.
- **Espaçamento**: `gap-4` (reduzido de 6 para 4 para densidade de informação).
- **Interação**: Hover sutil na borda ou sombra leve.
```tsx
<Card className="hover:border-primary/50 transition-colors">
```

### Badges
- Use `variant="outline"` ou `variant="secondary"` para status neutros.
- Use variantes `outline-*` para status semânticos (sucesso, aviso, info).
- Use `variant="destructive"` APENAS para erros críticos ou bugs.

### Status Colors (Padronização)
| Status | Variant/Class |
|--------|---------------|
| TODO | `variant="outline"` |
| DOING | `variant="outline-info"` |
| REVIEW | `variant="outline-purple"` |
| DONE | `variant="outline-success"` |
| HIGH | `variant="outline-warning"` |
| BUG/CRITICAL | `variant="destructive"` |

---

## 4. UX Patterns

### Feedback
- **Loading**: Use `Loader2` com `animate-spin`.
- **Empty States**: Sempre forneça um estado vazio claro com uma ação de criação.
  ```tsx
  <div className="text-center p-12 border border-dashed rounded-lg">
    <Icon className="mx-auto h-12 w-12 text-muted-foreground" />
    <h3 className="mt-2 font-semibold">Nenhum item</h3>
    <Button>Criar Novo</Button>
  </div>
  ```

### Navegação
- **Breadcrumbs/Voltar**: Sempre ofereça botão de voltar em páginas internas.
- **Tabs**: Use para separar contextos (ex: Epics vs Tasks).

---

## 5. Checklist de Qualidade (Definition of Done)

1. [ ] **Sem cores hardcoded** (apenas variáveis de tema).
2. [ ] **Mobile-friendly** (sem overflow horizontal, textos legíveis).
3. [ ] **Dark Mode** nativo (já garantido pelas variáveis).
4. [ ] **Acessibilidade** (contraste adequado, focus states visíveis).
