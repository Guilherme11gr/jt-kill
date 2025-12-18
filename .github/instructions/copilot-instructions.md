---
applyTo: '**'
---

# Prompt padrão de arquitetura e qualidade

## Objetivo
Escreva código seguindo nossa clean architecture leve, rotas finas (controllers) e regras claras de domínio.

## Papéis e limites

### Routes (controllers)
- Extrair/validar params/body (tipos nomeados)
- Autenticar se preciso
- Chamar use case/service
- Mapear erro→status
- Aplicar headers de cache
- Serializar resposta
- **Não conter regra de negócio nem acesso direto a dados fora de adapters**

### Use cases (application)
- Centro da regra de negócio
- Puros/testáveis
- Sempre em centavos (dinheiro)
- Determinísticos
- Dependem só de ports (repos)
- **Não conhecer Next/HTTP/UI**

### Services server-only (server/)
- Composição para SSR/BFF e cache de leitura
- React cache/revalidateTag
- **Não reimplementar regra de negócio**

### Infra/adapters
- Implementam ports (Supabase/HTTP externo)
- Podem ter TTL/updated_at
- **Sem lógica de domínio**

### Shared (interfaces/http/_shared)
- DTOs/tipos nomeados
- Parsers/validadores de query/body
- cacheHeaders

## 🔴 REGRA CRÍTICA: TESTES NUNCA SÃO BYPASS

**PRINCÍPIO FUNDAMENTAL**: Testes validam o comportamento do código. NUNCA altere testes para passar sem entender o erro.

### Processo obrigatório ao encontrar teste falhando:

1. **PARE e ANALISE o erro**:
   - Leia a mensagem de erro completa
   - Entenda o que o teste está validando
   - Verifique o comportamento esperado vs atual

2. **DIAGNOSTIQUE a causa raiz**:
   - ❓ **É BUG no código?** → O teste está correto e revelou um bug real
   - ❓ **É teste desatualizado?** → A feature mudou e o teste precisa refletir o novo comportamento
   - ❓ **É teste mal escrito?** → Testa implementação ao invés de comportamento

3. **AÇÃO baseada no diagnóstico**:
   - ✅ **Se BUG no código**: Corrija o código (não o teste!) e documente em BUGS-FOUND.md
   - ✅ **Se teste desatualizado**: Atualize o teste COM JUSTIFICATIVA do que mudou
   - ✅ **Se teste mal escrito**: Refatore para testar comportamento, não implementação

4. **NUNCA faça**:
   - ❌ Alterar expectativas do teste sem entender por quê
   - ❌ Comentar/skipar testes que falham
   - ❌ Mudar mocks para fazer teste passar artificialmente
   - ❌ Adicionar lógica no código SÓ para passar no teste (test-driven é diferente!)

**Lembre-se**: Teste falhando é INFORMAÇÃO valiosa, não um problema a ser escondido.

---

## Regras de código

- ✅ Sem variáveis de uma letra; nomes descritivos
- ✅ Sem tipos inline grandes; use types/interfaces nomeadas (DTOs, Inputs, Outputs)
- ✅ Extraia lógica complexa de tela para hooks em src/hooks
- ✅ Em rotas, extraia para use cases/services
- ✅ Componentize trechos grandes; componentes pequenos, focados e reutilizáveis
- ✅ **Dinheiro: centavos no domínio; formatação só na borda (UI)**
- ✅ **Datas: SEMPRE consultar `docs/guides/date-handling.md` antes de manipular datas**
  - **OBRIGATÓRIO: usar APENAS funções de `@/shared/utils/date-utils`**
  - **PROIBIDO: usar date-fns diretamente (startOfDay, addDays, format, etc.)**
  - **PROIBIDO: criar Date direto ou concatenar strings de data**
  - **RAZÃO: Padronização de timezone é CRÍTICA para o negócio**
    - date-utils encapsula toda lógica de timezone (UTC backend, local UI)
    - Evita bugs silenciosos de horário (agendamento errado = cliente perdido)
    - Única fonte de verdade para manipulação de datas
  - Backend/Banco: sempre UTC
  - UI: sempre timezone local (America/Sao_Paulo)
  - Se precisar de função não existente em date-utils, ADICIONE LÁ (não use date-fns direto)
  - **Ver também**: `docs/guides/timezone-strategy.md` para detalhes da centralização
- ✅ **Telefone: SEMPRE exibir com máscara (XX) XXXXX-XXXX**
- ✅ Imports organizados; sem warnings de lint; typecheck verde
- ✅ Evite duplicação: se repetiu, crie util/hook/shared
- ✅ Código legível, funções pequenas, parâmetros claros, early-returns
- ✅ Composição > herança; domínio desacoplado de UI/transporte
- ✅ Público (hook/componente/use case): tipos claros e contrato (inputs, outputs, efeitos)
- ✅ Acessibilidade básica na UI (aria-live, labels)
- ✅ Otimize sem micro: caches curtos, debounce/abort quando fizer sentido no cliente/HTTP
- ✅ **Sempre crie tipo para props/DTOs**

## Formatação de Dados

### Telefone
```typescript
// ✅ SEMPRE usar formatPhone() ao exibir telefone
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

// Exemplo: +5516996140277 → (16) 99614-0277
// ❌ NUNCA exibir telefone sem máscara
```

### Dinheiro
```typescript
// ✅ Domínio: sempre em centavos (number)
// ✅ UI: formatPrice() ou formatCurrency()
import { formatPrice } from '@/shared/utils/formatters';

const revenueInCents = 82000; // centavos
formatPrice(revenueInCents); // "R$ 820,00"
```

## Padrões práticos

### PARA USE CASES
- ✅ **SEMPRE CRIE TESTES QUE DEVEM PASSAR**
- ✅ **Crie um .md com o mesmo nome do arquivo e descreva o que ele faz** (seguindo padrão de usecase já existente)

### Rotas
- **SEMPRE use `extractAuthenticatedTenant()` para auth** (não reimplementar)
- **Busque estado atual ANTES de mutações** (para rollback/cleanup)
- **Use helpers de storage** (rollbackUpload, cleanupOldFile) quando aplicável
- Validar slug/ids com regex compartilhada
- Parsear query via parser compartilhado
- Usar `cacheHeaders('short'|'medium'|'long')`
- Nada de formatação de dinheiro
- Retornar 4xx/404 cedo
- Mapear erros de domínio via handleError

### Use cases
- Inputs/outputs tipados
- Sem dependência de framework
- Recebem ports nas deps
- Ex.: rankPromotionalProducts, listProducts

### Services server-only
- Agregações cross-fonte (views analíticas + repos)
- React cache, revalidateTag

### Caches
- HTTP headers na rota
- React cache/revalidateTag em services
- TTL em repos
- Cache com react query se oportuno no client
- **Evite cache no use case**

### Externos
- Fetch com AbortController e timeout razoável

## Helper Patterns (Auth & Infra)

### Auth Helpers (`shared/http/`)
- **SEMPRE use `extractAuthenticatedTenant(supabase)` em rotas protegidas**
- Retorna `{ userId, tenantId }` tipado
- Lança `UnauthorizedError` (401) ou `ForbiddenError` (403)
- **Não reimplementar lógica de auth** - centralize no helper
- Exemplo:
  ```typescript
  const supabase = createClient();
  const { userId, tenantId } = await extractAuthenticatedTenant(supabase);
  ```

### Storage Helpers (`infra/adapters/supabase/`)
- **Cleanup é best-effort** (não bloqueia sucesso se falhar)
- **Rollback é CRÍTICO** (indica arquivo órfão se falhar)
- Helpers recebem options object com `supabase`, `bucket`, `tenantId`, `endpoint`
- **Sempre buscar estado ANTES de fazer upload** (para cleanup posterior)
- Padrão de uso:
  1. Fetch estado atual antes da mutação
  2. Fazer upload/mutação
  3. Se DB falhar → rollback (crítico)
  4. Se DB suceder → cleanup old (best-effort)

### Quando Criar Helpers
Extrair para helpers quando:
- ✅ Lógica repetida em múltiplas rotas (auth, cleanup, rollback)
- ✅ Operação complexa de infraestrutura (storage, external API)
- ✅ Validação/transformação reutilizável
- ✅ Função tem >30 linhas ou >3 responsabilidades

Manter na rota quando:
- ✅ Orquestração do fluxo (early returns, error mapping)
- ✅ Validação específica do endpoint
- ✅ Construção de resposta HTTP

### Rotas: Padrão Thin Controller
- **Numere os passos** com comentários (// 1. Auth, // 2. Rate limit, ...)
- **Try/catch centralizado** para custom errors (UnauthorizedError, ForbiddenError)
- **Máximo 50-60 linhas** por método HTTP
- **Use helpers** para reduzir complexidade ciclomática
- **SEMPRE use `extractAuthenticatedTenant()` para auth** (não reimplementar)
- **Busque estado atual ANTES de mutações** (para rollback/cleanup)
- **Use helpers de storage** (rollbackUpload, cleanupOldFile) quando aplicável

### Camadas de Helpers
- **`shared/http/`** → Adaptadores HTTP genéricos (auth, CORS, headers)
- **`infra/adapters/`** → Adaptadores de infraestrutura específica (Supabase, APIs externas)
- **`shared/utils/`** → Utilitários puros sem dependência de framework

## Qualidade e entrega

- **Quality gates: Build, Lint/Typecheck, Tests** — reporte PASS/FAIL
- Se falhar, tente até 3 correções focadas; depois resuma causa/alternativas
- Evite mudanças de formato público sem atualizar tipos/tests/doc
- **Após mudanças visuais/funcionais: SEMPRE atualizar versão do Service Worker em `public/sw.js`**
  - Incrementar `VERSION` (ex: `v1.0.3` → `v1.0.4`)
  - Força limpeza de cache PWA no client

## Planejamento de Features

**SEMPRE fazer reflexão crítica ANTES de implementar:**

### Processo de Validação
1. **Questione o valor real**:
   - Resolve problema real do usuário?
   - Melhora UX ou é apenas "nice to have"?
   - Pode causar confusão ou redundância?

2. **Análise de Negócio**:
   - Impacto operacional positivo?
   - Alinha com workflow do cliente?
   - É acionável ou só informativo?

3. **Apresente Análise Completa**:
   ```
   ❌ Problemas Identificados:
   - Liste pontos negativos/riscos
   - Complexidade vs valor
   - Alternativas melhores
   
   ✅ Benefícios (se houver):
   - Liste vantagens reais
   - Casos de uso concretos
   
   💡 Recomendação:
   - Implementar? SIM/NÃO
   - Proposta alternativa (se aplicável)
   - Argumentos para decisão final
   ```

4. **Aguardar Decisão**:
   - Não implementar sem aprovação
   - Apresentar trade-offs claramente
   - Sugerir MVP ou iteração incremental

### 🔴 REGRA DE OURO: EXPLIQUE ANTES DE FAZER
Antes de escrever qualquer linha de código para uma nova feature ou refatoração complexa:
1. **Explique seu plano mental**: "Vou criar um Use Case X, que será chamado pela Página Y. Vou usar Z para performance."
2. **Valide a arquitetura**: Confirme se está seguindo os padrões (Server Components para dados, Client Components para interatividade).
3. **Espere o OK** (implícito ou explícito) se a mudança for grande.

### Princípio
**"Menos é mais"** - Cada feature adiciona complexidade. Só implemente o que agrega valor claro e mensurável.

## Contratos (template)

### Use case
```typescript
Input: { ... } // centavos, ids, slugs
Output: { ... } // centavos
Erros: DomainError/NotFoundError
```

### Rota
- Valida DTO (tipos nomeados)
- Chama use case/service
- Aplica cacheHeaders
- Retorna JSON

---

## 📚 Documentação do Projeto

### Estrutura de Docs (Reorganizada em Nov/2025)

A documentação está organizada em categorias para facilitar navegação:

```
docs/
├── README.md              # 📖 COMECE AQUI - Índice completo
├── AI-CONTEXT.md          # 🤖 Contexto rápido para AI Agents
├── architecture/          # 🏗️ Decisões arquiteturais
├── guides/                # 📖 Guias práticos  
├── integrations/          # 🔌 Google Calendar, N8N, WhatsApp
├── ui-ux/                 # 🎨 Design system
├── planning/              # 📊 Status, roadmap, prioridades
└── database/              # 🗄️ Schema, migrations
```

### Documentos Essenciais (Leitura Obrigatória)

1. **`docs/AI-CONTEXT.md`** ⭐
   - Contexto rápido do projeto em uma página
   - Regras de negócio CRÍTICAS
   - Stack tecnológico
   - Onde encontrar cada tipo de informação

2. **`docs/planning/project-status.md`** ⭐
   - Visão geral 360° do projeto
   - Status de features implementadas
   - Métricas de qualidade
   - Próximos milestones

3. **`docs/guides/date-handling.md`** ⚠️ CRÍTICO
   - Manipulação de datas (UTC backend, local UI)
   - SEMPRE consultar antes de mexer com datas
   - Erros = agendamentos incorretos = cliente perdido

4. **`docs/architecture/admin-area.md`**
   - Estrutura da área administrativa
   - Rotas, autenticação, RLS policies

5. **`docs/architecture/booking-flow.md`**
   - Fluxo público de agendamento
   - Cache, polling, validações

### Guias Rápidos por Tarefa

| Tarefa | Documento |
|--------|-----------|
| **Entender o projeto** | `docs/AI-CONTEXT.md` |
| **Ver status atual** | `docs/planning/project-status.md` |
| **Manipular datas** | `docs/guides/date-handling.md` ⚠️ |
| **Padrões de UI** | `docs/ui-ux/standards.md` |
| **Fazer logging** | `docs/guides/logging-quick-start.md` |
| **Rate limiting** | `docs/guides/rate-limiting.md` |
| **OAuth tokens** | `docs/architecture/oauth-token-encryption.md` |
| **Sistema de notificações** | `docs/architecture/notification-system.md` |

### Tags Semânticas para Busca Rápida

- `#critical-business` - Regras de negócio críticas (datas, OAuth, timezone)
- `#architecture` - Decisões arquiteturais
- `#security` - Segurança (encryption, rate limiting, RLS)
- `#performance` - Otimizações de performance
- `#integrations` - Integrações externas
- `#ui-patterns` - Design system e padrões de UI

**Dica**: Todos os documentos principais têm metadados YAML no topo com tags para busca rápida.

---

## Projeto: Gestor de projetos simplificado


### Stack
- Next.js @latest com App Router
- TypeScript strict
- Supabase (auth + database) - **SEMPRE usar `mcp supabase`**
- **Tailwind CSS + Shadcn/UI**.
- Prisma ORM (possivel migração futura do supabase para vps com postgres dedicado)
- PWA configurado

### Design System
- **✅ SEMPRE usar Tailwind CSS puro (classes utilitárias)**
- **❌ NUNCA criar arquivos .css separados ou CSS-in-JS**
- **🎨 TEMA ESCURO PRIORITÁRIO E OBRIGATÓRIO**
- **✅ Componentes com `className` prop para extensibilidade**
- **✅ Usar `clsx` ou `cn` helper para classes condicionais**
- **⚠️ EVITAR animações que alteram dimensões (scale, width, height)** - Preferir opacity, colors, transforms (translate/rotate)
- **✅ Animações sutis: opacity, translate, colors (200-400ms duration)**

  
### Comandos Supabase
- **SEMPRE use `mcp supabase` ao invés de `supabase` diretamente**
- Migrations: `mcp supabase migration list`, `mcp supabase migration new`
- DB: `mcp supabase db push`, `mcp supabase db reset`
- Status: `mcp supabase status`

### MVP Features
 - a preencher
### Estrutura
```
src/
  app/              # Routes (controllers)
  domain/
    use-cases/      # Business logic
  infra/
    adapters/       # Supabase, external APIs
  server/           # Server-only services
  shared/           # DTOs, types, validators
  hooks/            # React hooks
  components/       # UI components
```

## Estratégia de Commits

Sugira pontos de commit seguindo convenção semântica e granularidade adequada:

### Quando sugerir commit
- ✅ Após completar uma feature funcional (use case + testes passando)
- ✅ Após criar estrutura completa (migração + rollback + docs)
- ✅ Após fix importante que resolve erro bloqueante
- ✅ Ao finalizar componente UI completo e testado
- ✅ Após refactor que mantém testes verdes

### Formato do commit
```
<tipo>(<escopo>): <descrição curta>

<corpo opcional com contexto>
```

### Tipos convencionais
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `refactor`: Refatoração sem mudança de comportamento
- `docs`: Apenas documentação
- `style`: Formatação, lint
- `test`: Adicionar/corrigir testes
- `chore`: Tarefas de manutenção (deps, config)
- `perf`: Melhoria de performance
- `ci`: Pipeline, scripts

### Exemplos
```bash
feat(database): add initial schema with multi-tenant support
fix(migration): replace uuid_generate_v4 with gen_random_uuid
feat(use-cases): add getTenantBySlug with tests
docs(database): document RLS policies and indexes
refactor(booking): extract validation to shared utils
```

### Granularidade
- **Muito pequeno**: cada arquivo = commit ❌
- **Ideal**: tarefa completa e funcional = commit ✅
- **Muito grande**: múltiplas features não relacionadas ❌
