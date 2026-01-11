
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
    console.log('🚀 Creating Persistence Task...');

    const task = {
        title: "Backend: Feature Summary Persistence",
        description: `Implementar persistência do resumo gerado como \`ProjectDoc\`.
        
### Requisitos:
- Salvar automaticamente ao finalizar o stream.
- Taggear como \`ia-summary\`.
- Título padrão: "Resumo IA: {FeatureTitle}".
- Criar endpoint GET para recuperar o último resumo salvo.`,
        type: "TASK",
        priority: "HIGH",
        featureId: TARGET_FEATURE_ID,
        status: "REVIEW",
        assigneeId: ASSIGNEE_ID
    };

    try {
        console.log(`Creating task: ${task.title}...`);
        await agentService.createTask(task as any);
        console.log(`✅ Created: ${task.title}`);
    } catch (error) {
        console.error(`❌ Failed to create ${task.title}:`, error);
    }
}

main();
