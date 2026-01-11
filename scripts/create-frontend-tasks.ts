
import { AgentService } from '../src/infra/agent/agent.service';

const AGENT_API_KEY = 'agk_5f8d2e1b9c3a4b7d8e9f0a1b2c3d4e5f';
const TARGET_FEATURE_ID = '22c3ef25-7916-4f50-aa65-97e175942660'; 
const ORG_ID = '11111111-1111-1111-1111-111111111111';
const ASSIGNEE_ID = 'b7d65a91-7cb6-4583-b46d-4f64713ffae2'; // Gepeto

const agentService = new AgentService({
    apiKey: AGENT_API_KEY,
    baseUrl: 'https://jt-kill.vercel.app/api/agent', 
    orgId: ORG_ID,
});

async function main() {
    console.log('🚀 Creating Frontend Tasks...');

    const tasksToCreate = [
        {
            title: "Frontend: Hook & Streaming Logic",
            description: `Implementar hook customizado \`useFeatureStreaming\` para gerenciar o stream de resposta da API.\n\n### Detalhes Técnicos:\n- Usar \`fetch\` com \`response.body.getReader()\``,
            type: "TASK",
            priority: "HIGH",
            featureId: TARGET_FEATURE_ID,
            status: "REVIEW",
            assigneeId: ASSIGNEE_ID
        },
        {
            title: "Frontend: UI Component & Integration",
            description: `Criar componente \`FeatureAISummaryCard\` e integrar na página de detalhes da feature.\n\n### Requisitos UI:\n- Botão de "Analisar"\n- Estado de loading/streaming\n- Renderização de Markdown em tempo real\n- Suporte a "Pensamentos" do DeepSeek`,
            type: "TASK",
            priority: "HIGH",
            featureId: TARGET_FEATURE_ID,
            status: "REVIEW",
            assigneeId: ASSIGNEE_ID
        }
    ];

    for (const task of tasksToCreate) {
        try {
            console.log(`Creating task: ${task.title}...`);
            await agentService.createTask(task as any);
            console.log(`✅ Created: ${task.title}`);
        } catch (error) {
            console.error(`❌ Failed to create ${task.title}:`, error);
        }
    }
}

main();
