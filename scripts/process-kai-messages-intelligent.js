// Script para processar mensagens do Kai Zone com MCP
// Busca dados reais dos projetos via MCP do Jira Killer

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres.kyeajchylsmhiuoslvuo:mesmerize11@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
});

async function processWithMCP(messageContent) {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@guilherme11gr/jt-kill-mcp'],
    env: {
      AGENT_API_KEY: 'agk_5f8d2e1b9c3a4b7d8e9f0a1b2c3d4e5f',
      AGENT_USER_ID: 'b7d65a91-7cb6-4583-b46d-4f64713ffae2',
      AGENT_API_URL: 'https://jt-kill.vercel.app/api/agent',
      AGENT_NAME: 'Kai'
    }
  });

  const client = new Client({ name: 'kai-intelligence', version: '1.0.0' });
  
  try {
    await client.connect(transport);
    
    const lower = messageContent.toLowerCase();
    let result = '';
    
    // Análise de projetos
    if (lower.includes('análise') || lower.includes('projetos') || lower.includes('status')) {
      const projects = await client.callTool({
        name: 'list_projects',
        arguments: {}
      });
      
      const projectsData = JSON.parse(projects.content[0].text);
      result = `📊 **Status dos Projetos**\n\n`;
      
      for (const proj of projectsData) {
        const tasks = await client.callTool({
          name: 'list_tasks',
          arguments: { projectId: proj.id, limit: 5 }
        });
        const tasksData = JSON.parse(tasks.content[0].text);
        const critical = tasksData.filter(t => t.priority === 'CRITICAL').length;
        
        result += `**${proj.name}** (${proj.key})\n`;
        result += `• Tasks: ${proj._count?.tasks || 0}\n`;
        result += `• Críticas: ${critical}\n\n`;
      }
    }
    
    // Tasks prioritárias
    else if (lower.includes('prioridade') || lower.includes('importante') || lower.includes('fazer')) {
      const allTasks = [];
      const projects = await client.callTool({ name: 'list_projects', arguments: {} });
      const projectsData = JSON.parse(projects.content[0].text);
      
      for (const proj of projectsData.slice(0, 2)) {
        const tasks = await client.callTool({
          name: 'list_tasks',
          arguments: { projectId: proj.id, priority: 'CRITICAL', limit: 5 }
        });
        const tasksData = JSON.parse(tasks.content[0].text);
        allTasks.push(...tasksData.map(t => ({ ...t, project: proj.name })));
      }
      
      result = `🎯 **Top Prioridades**\n\n`;
      allTasks.slice(0, 3).forEach((task, i) => {
        result += `${i + 1}. **${task.title}**\n`;
        result += `   Projeto: ${task.project}\n`;
        result += `   Status: ${task.status}\n\n`;
      });
    }
    
    // Bloqueios
    else if (lower.includes('bloqueio') || lower.includes('travado') || lower.includes('problema')) {
      const allBlocked = [];
      const projects = await client.callTool({ name: 'list_projects', arguments: {} });
      const projectsData = JSON.parse(projects.content[0].text);
      
      for (const proj of projectsData) {
        const tasks = await client.callTool({
          name: 'list_tasks',
          arguments: { projectId: proj.id, blocked: true }
        });
        const tasksData = JSON.parse(tasks.content[0].text);
        if (tasksData.length > 0) {
          allBlocked.push({ project: proj.name, tasks: tasksData });
        }
      }
      
      if (allBlocked.length === 0) {
        result = `✅ **Nenhum bloqueio ativo!**\n\nTodas as tasks estão fluindo.`;
      } else {
        result = `🚫 **Bloqueios Encontrados**\n\n`;
        allBlocked.forEach(({ project, tasks }) => {
          result += `**${project}**\n`;
          tasks.forEach(t => {
            result += `• ${t.title}\n`;
          });
          result += `\n`;
        });
      }
    }
    
    // Detalhes de tasks específicas
    else if (lower.includes('detalhe') || lower.includes('sobre') || lower.includes('qual')) {
      result = `🤔 Você quer detalhes sobre algo específico?\n\nPosso buscar:\n• Tasks críticas de qualquer projeto\n• Épicos em andamento\n• Features bloqueadas\n\nMe diga qual projeto ou task quer explorar.`;
    }
    
    // Saudação padrão
    else {
      result = `Olá! Sou o Kai, seu assistente no Jira Killer. 🦞\n\nPosso te ajudar com:\n• **Análise dos projetos** - status geral\n• **Tasks prioritárias** - o que fazer agora\n• **Bloqueios** - o que tá travado\n• **Detalhes** - aprofundar em tasks específicas\n\nO que você precisa?`;
    }
    
    await client.close();
    return result;
    
  } catch (error) {
    console.error('Erro MCP:', error.message);
    await client.close();
    return `Olá! Sou o Kai. Estou com uma conexão lenta agora, mas posso te ajudar.\n\nTenta perguntar de novo em alguns segundos, ou me chama aqui no chat direto.`;
  }
}

async function processPendingMessages() {
  try {
    // Busca mensagens pendentes
    const pendingMessages = await prisma.$queryRaw`
      SELECT * FROM public.kai_messages 
      WHERE status = 'pending' 
      AND direction = 'incoming'
      ORDER BY created_at ASC
      LIMIT 5
    `;

    if (pendingMessages.length === 0) {
      console.log('📭 Nenhuma mensagem pendente');
      return;
    }

    console.log(`📨 ${pendingMessages.length} mensagem(ns) pendente(s)`);

    // Processa em paralelo
    await Promise.all(pendingMessages.map(async (msg) => {
      console.log(`\n📝 Processando: "${msg.content.substring(0, 50)}..."`);
      
      // Gera resposta inteligente com MCP
      const reply = await processWithMCP(msg.content);
      
      // Atualiza mensagem com resposta
      await prisma.$executeRaw`
        UPDATE public.kai_messages 
        SET reply = ${reply}, 
            status = 'completed',
            updated_at = NOW()
        WHERE id = ${msg.id}::uuid
      `;
      
      console.log(`✅ Respondido (${reply.length} chars)`);
    }));

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Executa
processPendingMessages();
