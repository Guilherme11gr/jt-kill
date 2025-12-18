---
tags: [critical-business, guides, dates, timezone]
priority: critical
last-updated: 2025-12
---

# ⚠️ Guia de Manipulação de Datas (CRÍTICO)

> **LEIA ESTE DOCUMENTO ANTES DE MEXER COM DATAS**
> Erros de timezone = agendamentos incorretos = usuários perdidos

## Regra de Ouro

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🗄️ BACKEND/BANCO           🖥️ FRONTEND/UI                    │
│                                                                 │
│   ┌─────────────────┐       ┌─────────────────┐                │
│   │     SEMPRE      │       │     SEMPRE      │                │
│   │      UTC        │       │  Timezone Local │                │
│   │                 │       │ America/Sao_Paulo│               │
│   └─────────────────┘       └─────────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ❌ PROIBIDO

```typescript
// ❌ NUNCA faça isso:

// Usar date-fns diretamente
import { startOfDay, addDays, format } from 'date-fns';

// Criar Date diretamente
const now = new Date();
const date = new Date('2025-12-18');

// Concatenar strings de data
const dateStr = `${year}-${month}-${day}`;

// Usar toISOString sem converter
const isoDate = date.toISOString();
```

---

## ✅ OBRIGATÓRIO

```typescript
// ✅ SEMPRE use funções de date-utils:
import { 
  getCurrentDate,
  formatDateForDisplay,
  formatDateForDatabase,
  parseDate,
  addDaysToDate,
  startOfDayLocal,
  startOfDayUTC,
} from '@/shared/utils/date-utils';

// Obter data atual
const now = getCurrentDate();

// Formatar para exibição (timezone local)
const display = formatDateForDisplay(date);  // "18/12/2025"

// Formatar para banco (UTC)
const dbDate = formatDateForDatabase(date);  // "2025-12-18T00:00:00.000Z"

// Parse de string
const parsed = parseDate('2025-12-18');

// Adicionar dias
const nextWeek = addDaysToDate(date, 7);
```

---

## Funções do date-utils

### Obter Data Atual

```typescript
// Retorna Date no timezone local
const now = getCurrentDate();
```

### Formatação para Display (UI)

```typescript
// Formato brasileiro: dd/MM/yyyy
formatDateForDisplay(date);  // "18/12/2025"

// Com hora
formatDateTimeForDisplay(date);  // "18/12/2025 14:30"

// Formato relativo
formatRelativeDate(date);  // "há 2 horas", "ontem", "há 3 dias"
```

### Formatação para Banco (Backend)

```typescript
// ISO 8601 em UTC
formatDateForDatabase(date);  // "2025-12-18T17:30:00.000Z"

// Apenas data (para queries de range)
formatDateOnlyForDatabase(date);  // "2025-12-18"
```

### Parse de Strings

```typescript
// De string ISO (do banco)
const date = parseDate('2025-12-18T17:30:00.000Z');

// De string local (input do usuário)
const userDate = parseDateFromInput('18/12/2025');
```

### Manipulação

```typescript
// Adicionar/subtrair dias
const tomorrow = addDaysToDate(date, 1);
const yesterday = addDaysToDate(date, -1);

// Início/fim do dia
const startLocal = startOfDayLocal(date);  // 00:00:00 local
const startUTC = startOfDayUTC(date);      // 00:00:00 UTC
const endLocal = endOfDayLocal(date);      // 23:59:59 local

// Comparações
const isSame = isSameDay(date1, date2);
const isBefore = isDateBefore(date1, date2);
const isAfter = isDateAfter(date1, date2);
```

---

## Cenários Comuns

### 1. Salvar Data no Banco

```typescript
// ✅ Correto
const task = {
  createdAt: formatDateForDatabase(getCurrentDate()),
  dueDate: formatDateForDatabase(selectedDate),
};

// ❌ Errado
const task = {
  createdAt: new Date().toISOString(),
  dueDate: selectedDate.toISOString(),
};
```

### 2. Exibir Data do Banco na UI

```typescript
// ✅ Correto
const displayDate = formatDateForDisplay(parseDate(task.createdAt));

// ❌ Errado
const displayDate = task.createdAt;
```

### 3. Query por Range de Data

```typescript
// ✅ Correto - buscar tasks de hoje
const todayStart = startOfDayUTC(getCurrentDate());
const todayEnd = endOfDayUTC(getCurrentDate());

const { data } = await supabase
  .from('tasks')
  .select('*')
  .gte('created_at', formatDateForDatabase(todayStart))
  .lte('created_at', formatDateForDatabase(todayEnd));

// ❌ Errado
const { data } = await supabase
  .from('tasks')
  .select('*')
  .gte('created_at', new Date().toISOString());
```

### 4. Input de Data do Usuário

```typescript
// ✅ Correto
function handleDateChange(inputValue: string) {
  const date = parseDateFromInput(inputValue);
  const dbValue = formatDateForDatabase(date);
  setFormData({ ...formData, dueDate: dbValue });
}

// ❌ Errado
function handleDateChange(inputValue: string) {
  setFormData({ ...formData, dueDate: inputValue });
}
```

---

## Timezone no Brasil

O sistema assume timezone `America/Sao_Paulo` (UTC-3).

```typescript
// Constantes no date-utils
export const TIMEZONE = 'America/Sao_Paulo';
export const UTC_OFFSET_HOURS = -3;
```

### Horário de Verão

O Brasil **não** tem mais horário de verão (desde 2019), então o offset é fixo em UTC-3.

---

## Adicionar Nova Função

Se precisar de uma função que não existe em date-utils:

1. **NÃO** use date-fns diretamente no seu código
2. **ADICIONE** a função em `@/shared/utils/date-utils.ts`
3. **DOCUMENTE** a função com JSDoc
4. **TESTE** a função com diferentes timezones

```typescript
// Em date-utils.ts

/**
 * Retorna o primeiro dia do mês da data fornecida
 * @param date - Data de referência
 * @returns Date no início do mês (timezone local)
 */
export function startOfMonthLocal(date: Date): Date {
  // implementação usando date-fns internamente
  return startOfMonth(date);
}
```

---

## Checklist de Review

Ao revisar código com datas, verifique:

- [ ] Usa funções de `@/shared/utils/date-utils`?
- [ ] Não usa date-fns diretamente?
- [ ] Não cria `new Date()` diretamente?
- [ ] Backend/banco está em UTC?
- [ ] UI exibe em timezone local?
- [ ] Queries de range usam UTC?

---

## Ver Também

- [../architecture/overview.md](../architecture/overview.md) - Arquitetura geral
- `src/shared/utils/date-utils.ts` - Implementação das funções
