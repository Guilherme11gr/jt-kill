import { AIAdapter } from '@/infra/adapters/ai/ai.adapter';
import { EpicRepository, FeatureRepository } from '@/infra/adapters/prisma';

interface GenerateEpicSummaryInput {
    epicId: string;
    orgId: string;
    forceRegenerate?: boolean;
}

const SYSTEM_PROMPT = `Atue como um Tech Lead e Product Manager Sênior.
Seu objetivo é gerar um Resumo Executivo Analítico de um Épico de software.
Você deve analisar friamente os dados e dar um parecer sobre o andamento.

Estrutura Obrigatória do Markdown:

## 📊 Visão Geral
(Resumo de 2-3 linhas sobre o objetivo do épico e seu estado atual de conclusão)

## 🚧 Status das Features
(Liste as features agrupadas por status macro, ex: "Em Desenvolvimento", "Concluídas", "Não Iniciadas")
- **[Nome Feature]** ([Status Feature]):
  - *Progresso*: X/Y tasks concluídas ([%])
  - *Detalhes*: (Cite brevemente o que está sendo feito ou o que falta, mencionando tasks críticas se houver)

## 🚦 Análise de Risco e Próximos Passos
- (Identifique gargalos: features atrasadas, muitas tasks de alta prioridade pendentes, ou bugs abertos)
- (Sugestão de foco imediato para a equipe)

Regras:
- Use Português do Brasil.
- Seja analítico e orientado a dados.
- Se houver Bugs abertos, DESTAQUE-OS em Riscos.
- Não invente informações. Use apenas os dados fornecidos.`;

interface Deps {
    epicRepository: EpicRepository;
    featureRepository: FeatureRepository;
    aiAdapter: AIAdapter;
}

export async function generateEpicSummary(
    input: GenerateEpicSummaryInput,
    deps: Deps
): Promise<string> {
    const { epicRepository, featureRepository, aiAdapter } = deps;

    // 1. Fetch Deep Context
    const epic = await epicRepository.findByIdWithProject(input.epicId, input.orgId);
    if (!epic) throw new Error('Épico não encontrado');

    const features = await featureRepository.findManyInEpicWithTasks(input.epicId, input.orgId);

    // 2. Calculate Metrics
    let totalTasks = 0;
    let completedTasks = 0;
    let totalFeatures = features.length;
    let completedFeatures = 0;

    const featureAnalysis = features.map(f => {
        const fTotal = f.tasks.length;
        const fCompleted = f.tasks.filter(t => t.status === 'DONE').length;
        const fBugs = f.tasks.filter(t => t.type === 'BUG' && t.status !== 'DONE').length;
        const fInProgress = f.tasks.filter(t => t.status === 'DOING').length;

        totalTasks += fTotal;
        completedTasks += fCompleted;
        if (f.status === 'DONE') completedFeatures++;

        return {
            title: f.title,
            status: f.status,
            stats: `${fCompleted}/${fTotal}`,
            percent: fTotal > 0 ? Math.round((fCompleted / fTotal) * 100) : 0,
            bugs: fBugs,
            blocking: fInProgress,
            tasks: f.tasks.map(t => `- [${t.status}] ${t.type === 'BUG' ? '🐞 ' : ''}${t.title} (${t.priority})`).join('\n')
        };
    });

    const epicPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 3. Build Prompt
    const userPrompt = `
DADOS DO ÉPICO:
Título: ${epic.title}
Descrição: ${epic.description || 'N/A'}
Status Atual: ${epic.status}
Progresso Global: ${completedTasks}/${totalTasks} tasks (${epicPercent}%)
Features Concluídas: ${completedFeatures}/${totalFeatures}

DETALHAMENTO POR FEATURE:
${featureAnalysis.map(f => `
### ${f.title}
- Status: ${f.status}
- Progresso: ${f.percent}% (${f.stats})
- Bugs Abertos: ${f.bugs}
- Tasks Importantes:
${f.tasks}
`).join('\n')}

TAREFA: Gere o Resumo Executivo Analítico seguindo o template do sistema. Destaque features com bugs ou baixo progresso.
`;

    // 4. Call AI
    const response = await aiAdapter.generateText(
        userPrompt,
        {
            systemPrompt: SYSTEM_PROMPT,
            temperature: 0.4, // Lower temperature for analytical precision
            maxTokens: 1500,
        }
    );

    return response;
}
