import { AIAdapter } from '@/infra/adapters/ai/ai.adapter';
import { EpicRepository, FeatureRepository } from '@/infra/adapters/prisma';

interface GenerateEpicSummaryInput {
    epicId: string;
    orgId: string;
    forceRegenerate?: boolean;
}

const SYSTEM_PROMPT = `Atue como um Product Manager Sênior e experiente.
Analise os dados deste Épico e gere um relatório curto, direto e executivo em Markdown.

Estrutura Obrigatória:

### 1. 👔 O Veredito
(Uma frase resumo sobre a saúde geral do épico. Comece com 🟢, 🟡 ou 🔴. Diga se está saudável, em risco ou atrasado.)

### 2. ⚠️ Bloqueios e Riscos
(Liste tasks paradas em DOING há mais de 4 dias, features com bugs abertos ou muitos itens não iniciados. Seja específico. Se houver "Tasks Sem Movimento", cite-as.)

### 3. 📅 Previsão e Próximos Passos
(Baseado no ritmo e no que falta, dê uma estimativa macro e sugira onde focar. Ex: "Focar em fechar bugs da feature X".)

Regras:
- Seja conciso. O leitor é um executivo.
- Destaque riscos reais.
- Use tom profissional mas direto.
- Não invente datas se não tiver certeza, mas faça projeções baseadas no volume de trabalho restante.`;

interface Deps {
    epicRepository: EpicRepository;
    featureRepository: FeatureRepository;
    aiAdapter: AIAdapter;
}

export async function generateEpicSummary(
    input: GenerateEpicSummaryInput,
    deps: Deps
): Promise<{ summary: string; lastAnalyzedAt: Date }> {
    const { epicRepository, featureRepository, aiAdapter } = deps;

    // 1. Fetch Deep Context
    const epic = await epicRepository.findByIdWithProject(input.epicId, input.orgId);
    if (!epic) throw new Error('Épico não encontrado');

    const features = await featureRepository.findManyInEpicWithTasks(input.epicId, input.orgId);

    // 2. Metrics & Analysis
    const now = new Date();
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(now.getDate() - 4);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(now.getDate() - 2);

    let totalTasks = 0;
    let completedTasks = 0;
    let totalFeatures = features.length;
    let completedFeatures = 0;

    // Global lists for prompt
    const allStaleTasks: string[] = [];
    const recentActivity: string[] = [];

    const featureAnalysis = features.map(f => {
        const fTotal = f.tasks.length;
        const fCompleted = f.tasks.filter(t => t.status === 'DONE').length;
        const fBugs = f.tasks.filter(t => t.type === 'BUG' && t.status !== 'DONE').length;
        const fInProgress = f.tasks.filter(t => t.status === 'DOING').length;

        // Check for stale tasks (Doing for > 4 days)
        f.tasks.forEach(t => {
            // @ts-ignore - repository was updated but types might lag in IDE
            const updatedAt = t.updatedAt ? new Date(t.updatedAt) : new Date();

            if (t.status === 'DOING' && updatedAt < fourDaysAgo) {
                allStaleTasks.push(`- [${f.title}] Task "${t.title}" parada em DOING há mais de 4 dias.`);
            }

            if (t.status === 'DONE' && updatedAt > twoDaysAgo) {
                recentActivity.push(`- [${f.title}] Task "${t.title}" concluída recentemente.`);
            }
        });

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
            // Only list non-done tasks to save tokens, highlighting bugs
            tasks: f.tasks
                .filter(t => t.status !== 'DONE')
                .map(t => `- [${t.status}] ${t.type === 'BUG' ? '🐞 ' : ''}${t.title} (${t.priority})`)
                .join('\n')
        };
    });

    const epicPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 3. Build Prompt
    const userPrompt = `
DADOS DO ÉPICO:
Título: ${epic.title}
Status Atual: ${epic.status}
Progresso Global: ${completedTasks}/${totalTasks} tasks (${epicPercent}%)
Features Concluídas: ${completedFeatures}/${totalFeatures}

🚨 TASKS SEM MOVIMENTO (RISCO):
${allStaleTasks.length > 0 ? allStaleTasks.join('\n') : "Nenhuma task parada identificada."}

⚡ ATIVIDADE RECENTE (Últimas 48h):
${recentActivity.length > 0 ? recentActivity.slice(0, 5).join('\n') : "Nenhuma conclusão recente."}

DETALHAMENTO POR FEATURE (Foco no que falta):
${featureAnalysis.map(f => `
### ${f.title}
- Status: ${f.status}
- Progresso: ${f.percent}%
- Bugs Abertos: ${f.bugs}
- Tasks Pendentes:
${f.tasks || " (Todas as tasks concluídas)"}
`).join('\n')}

TAREFA: Gere o Executive Briefing (O Veredito, Bloqueios/Riscos, Previsão).
`;

    // 4. Call AI
    const summary = await aiAdapter.generateText(
        userPrompt,
        {
            systemPrompt: SYSTEM_PROMPT,
            temperature: 0.5,
            maxTokens: 1000,
        }
    );

    // 5. Persist Result
    const lastAnalyzedAt = new Date();
    await epicRepository.update(input.epicId, input.orgId, {
        aiSummary: summary,
        lastAnalyzedAt
    });

    return {
        summary,
        lastAnalyzedAt
    };
}
