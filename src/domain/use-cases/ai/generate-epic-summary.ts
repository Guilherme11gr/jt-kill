import { AIAdapter } from '@/infra/adapters/ai/ai.adapter';
import { EpicRepository, FeatureRepository } from '@/infra/adapters/prisma';

interface GenerateEpicSummaryInput {
    epicId: string;
    orgId: string;
    forceRegenerate?: boolean;
}

// 🔥 MELHORIA 1: Prompt calibrado para "Startup Mode"
const SYSTEM_PROMPT = `Atue como um Tech Lead Ágil em uma startup de alta performance.
Seu objetivo é gerar um 'Executive Briefing' focado em desbloqueio e velocidade.

Mentalidade Obrigatória:
1. Backlog cheio é BOM (significa visão clara), não ruim. Não aponte volume de trabalho futuro como risco.
2. Estagnação é RUIM. Tasks paradas em DOING ou REVIEW são os verdadeiros riscos.
3. Bugs são prioridade zero.
4. Dependências travadas (features que bloqueiam outras) são críticas.

Estrutura da Resposta (Markdown):

### 1. 👔 O Veredito
(Uma frase resumo sobre a saúde geral do épico. Comece com 🟢, 🟡 ou 🔴. Diga se está saudável, em risco ou atrasado.)

### 2. ⚠️ Bloqueios e Riscos Reais
(Foque APENAS no que impede o time de avançar HOJE. Cite tasks específicas paradas há dias. Ignore o que está planejado no backlog.)

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
    // 🔥 MELHORIA 2: Janelas de tempo mais agressivas
    const staleLimit = new Date();
    staleLimit.setDate(now.getDate() - 3); // 3 dias parado em DOING já é alerta em startup
    const reviewLimit = new Date();
    reviewLimit.setDate(now.getDate() - 2); // 2 dias em REVIEW é gargalo

    let totalTasks = 0;
    let completedTasks = 0;
    let totalFeatures = features.length;
    let completedFeatures = 0;

    // Global lists for prompt
    const criticalBlockers: string[] = [];
    const recentWins: string[] = [];

    const featureAnalysis = features.map(f => {
        const fTotal = f.tasks.length;
        const fCompleted = f.tasks.filter(t => t.status === 'DONE').length;
        // Prioriza Bugs não resolvidos
        const openBugs = f.tasks.filter(t => t.type === 'BUG' && t.status !== 'DONE');
        const fInProgress = f.tasks.filter(t => t.status === 'DOING').length;

        // Check for stale tasks (Riscos Reais)
        f.tasks.forEach(t => {
            // @ts-ignore
            const updatedAt = t.updatedAt ? new Date(t.updatedAt) : new Date();

            if (t.status === 'DOING' && updatedAt < staleLimit) {
                criticalBlockers.push(`- [${f.title}] 🛑 Task "${t.title}" travada em DOING há >3 dias.`);
            }

            if (t.status === 'REVIEW' && updatedAt < reviewLimit) {
                criticalBlockers.push(`- [${f.title}] ⚠️ Task "${t.title}" parada em REVIEW há >2 dias.`);
            }

            // Wins recentes (últimas 24h) para dar contexto de momentum
            const oneDayAgo = new Date();
            oneDayAgo.setDate(now.getDate() - 1);
            if (t.status === 'DONE' && updatedAt > oneDayAgo) {
                recentWins.push(`- [${f.title}] ✨ "${t.title}" entregue.`);
            }
        });

        totalTasks += fTotal;
        completedTasks += fCompleted;
        if (f.status === 'DONE') completedFeatures++;

        // 🔥 MELHORIA 3: Seleção inteligente de tasks para o prompt
        // Não mande 100 tasks. Mande Bugs + Bloqueios + Top 5 Prioridade Alta
        const relevantTasks = [
            ...openBugs.map(t => `- 🐞 BUG: ${t.title} (${t.status})`),
            ...f.tasks
                .filter(t => t.status !== 'DONE' && t.type !== 'BUG')
                .sort((a, b) => (a.priority === 'CRITICAL' ? -1 : 1)) // Críticos primeiro
                .slice(0, 5) // Top 5 apenas
                .map(t => {
                    // @ts-ignore
                    const desc = t.description ? ` - "${t.description.slice(0, 80)}${t.description.length > 80 ? '...' : ''}"` : '';
                    return `- ${t.status}: ${t.title} (${t.priority})${desc}`;
                })
        ];

        return {
            title: f.title,
            status: f.status,
            progress: fTotal > 0 ? Math.round((fCompleted / fTotal) * 100) : 0,
            openBugsCount: openBugs.length,
            isStuck: fInProgress > 0 && fCompleted === 0, // Começou mas não entrega nada
            relevantTasks: relevantTasks.join('\n')
        };
    });

    const epicPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 3. Build Prompt Otimizado
    const userPrompt = `
CONTEXTO DO PROJETO:
Épico: ${epic.title}
Progresso: ${epicPercent}% (${completedTasks}/${totalTasks} tasks)
Momentum: ${recentWins.length} entregas nas últimas 24h.

🚨 ALERTAS CRÍTICOS (O que está travado):
${criticalBlockers.length > 0 ? criticalBlockers.join('\n') : "✅ Nenhum bloqueio crítico detectado."}

ANÁLISE POR FEATURE (Foco em dependências e bugs):
${featureAnalysis.map(f => `
### [${f.status}] ${f.title}
- Saúde: ${f.openBugsCount > 0 ? '🔴 Com Bugs' : '🟢 Estável'}
- Progresso: ${f.progress}%
- O que falta (Top Prioridades):
${f.relevantTasks || " (Aguardando início ou concluída)"}
`).join('\n')}

TAREFA: Gere o Executive Briefing focado em ação.
`;

    // 4. Call AI
    const summary = await aiAdapter.generateText(
        userPrompt,
        {
            systemPrompt: SYSTEM_PROMPT,
            temperature: 0.4, // Menos criativo, mais analítico
            maxTokens: 800,
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
