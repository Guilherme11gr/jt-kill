import type { AIAdapter } from '@/infra/adapters/ai';
import { FeatureRepository } from '@/infra/adapters/prisma';
import { AI_TEMPERATURE_CREATIVE, AI_MAX_TOKENS_DESCRIPTION } from '@/config/ai.config';

interface GenerateFeatureSummaryInput {
  featureId: string;
  orgId: string;
}

const SYSTEM_PROMPT = `Você é um Líder Técnico experiente e pragmático.
Sua função é gerar um status report direto e humano sobre uma Feature, baseado nas tasks e comentários.

Seu público é outros devs e PMs. Eles querem saber:
1. O que realmente aconteceu? (Bloqueios, discussões, decisões)
2. O que está pronto?
3. O que falta?
4. A feature está saudável?

## Diretrizes de Estilo
- Use emojis moderadamente para facilitar leitura (✅, 🚧, 🔴, 🐛)
- Use **negrito** para destacar pontos chave
- Seja direto, evite "corporate speak"
- Se houver "Pensamentos" do modelo (reasoning), eles serão úteis, mas sua saída final deve ser Markdown limpo.

## Estrutura da Resposta
### 🔎 Análise do Trabalho
(Um resumo narrativo do que foi feito. Cite tasks específicas se relevante. Mencione discussões dos comentários se houver blockers ou mudanças de escopo).

### 🚦 Status & Riscos
- **Status Geral**: (Saudável, Atenção, Crítico)
- **Riscos Visíveis**: (Ex: bugs abertos, tasks paradas, falta de specs)

### 📋 Progresso
- ✅ Concluído: X%
- 🚧 Em Andamento: (Listar itens chave)
- 📅 Previsão: (Sua estimativa baseada no que falta)
`;

interface Deps {
  featureRepository: FeatureRepository;
  aiAdapter: AIAdapter;
}

export async function generateFeatureSummary(
  input: GenerateFeatureSummaryInput,
  deps: Deps
) {
  const { featureRepository, aiAdapter } = deps;

  // 1. Fetch Deep Context
  const feature = await featureRepository.findByIdWithTasksAndComments(input.featureId, input.orgId);
  if (!feature) throw new Error('Feature não encontrada');

  // 2. Prepare Context
  // 2. Prepare Context
  const tasksContext = feature.tasks.map(t => {
    const comments = t.comments.length > 0
      ? `\n    Comentários Recentes:\n${t.comments.map(c => `      - ${c.users.user_profiles?.displayName || 'Desconhecido'}: ${c.content}`).join('\n')}`
      : '';

    return `- [${t.status}] ${t.type === 'BUG' ? '🐛 ' : ''}${t.title}
    Desc: ${t.description ? t.description.slice(0, 100) + '...' : 'Sem descrição'}
    Pri: ${t.priority}${comments}`;
  }).join('\n\n');

  const context = `
FEATURE: ${feature.title}
EPIC: ${feature.epic.title}

TASKS & ATIVIDADE:
${tasksContext}
`;

  // 3. Call AI with Stream
  // Note: We return the stream directly to the controller/route
  const stream = aiAdapter.reasonerCompletionStream({
    objective: "Gerar Resumo Técnico de Feature",
    context,
    systemPrompt: SYSTEM_PROMPT,
    temperature: AI_TEMPERATURE_CREATIVE,
    maxTokens: AI_MAX_TOKENS_DESCRIPTION,
  });

  return stream;
}
