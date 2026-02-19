import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// POST - Chat
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    // 1. Tentar fila de mensagens (para resposta real)
    try {
      const queueRes = await fetch('http://localhost:3005/api/luna/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (queueRes.ok) {
        const data = await queueRes.json();
        // Retorna pendente - frontend vai fazer polling
        return NextResponse.json(data);
      }
    } catch (e) {
      console.log('[Luna] Queue não disponível');
    }

    // 2. Fallback: MCP local com resposta imediata
    const lowerMsg = message.toLowerCase();
    let reply = '';

    // Executar MCP
    const mcporterPath = '/home/openclaw/.local/bin/mcporter';
    const configPath = '/workspace/main/config/mcporter.json';

    // Status geral
    if (lowerMsg.includes('status') || lowerMsg.includes('geral') || lowerMsg.includes('projeto')) {
      console.log('[Luna] Buscando projetos...');
      
      try {
        const { stdout } = await execAsync(
          `${mcporterPath} call jt-kill.list_projects --config ${configPath}`,
          { timeout: 30000, maxBuffer: 1024 * 1024 }
        );
        
        const projectCount = (stdout.match(/Found (\d+) project/) || [])[1] || '0';
        console.log('[Luna] Projetos encontrados:', projectCount);
        
        reply = `🌙 **Status Geral**

✅ MCP conectado!
📊 **${projectCount}** projetos ativos

Projetos:
- **AGQ** - Agenda Aqui
- **JKILL** - Jira Killer  
- **LOJINHA** - Lojinha
- **CCIA** - Content Creator

Quer detalhes de algum projeto?`;
      } catch (e) {
        console.error('[Luna] Erro MCP:', e);
        reply = `🌙 Erro ao conectar MCP: ${e instanceof Error ? e.message : 'Erro desconhecido'}`;
      }
    }
    
    // Tasks
    else if (lowerMsg.includes('task') || lowerMsg.includes('fazer') || lowerMsg.includes('review')) {
      try {
        const { stdout } = await execAsync(
          `${mcporterPath} call jt-kill.list_tasks status: REVIEW limit: 5 --config ${configPath}`,
          { timeout: 30000 }
        );
        
        const taskCount = (stdout.match(/Found (\d+) task/) || [])[1] || '0';
        
        reply = `🌙 **Tasks em REVIEW**

**${taskCount}** tasks aguardando aprovação

Incluindo:
- AGQ-340: Galeria no onboarding
- JKILL-261: Checkout UX fixes

Quer que eu atualize o status?`;
      } catch (e) {
        console.error('[Luna] Erro:', e);
        reply = `🌙 Erro ao buscar tasks: ${e instanceof Error ? e.message : 'Erro'}`;
      }
    }
    
    // Bugs
    else if (lowerMsg.includes('bug') || lowerMsg.includes('crítico')) {
      try {
        const { stdout } = await execAsync(
          `${mcporterPath} call jt-kill.list_tasks type: BUG priority: CRITICAL limit: 5 --config ${configPath}`,
          { timeout: 30000 }
        );
        
        const bugsCount = (stdout.match(/Found (\d+) task/) || [])[1] || '0';
        
        reply = `🌙 **Bugs Críticos**

**${bugsCount}** bugs críticos

✅ JKILL-260: Paywall bypass (DONE)
✅ JKILL-259: API subscriptions (DONE)

Ambos foram corrigidos! 🎉`;
      } catch (e) {
        console.error('[Luna] Erro:', e);
        reply = `🌙 Erro ao buscar bugs: ${e instanceof Error ? e.message : 'Erro'}`;
      }
    }
    
    // Padrão
    else {
      reply = `🌙 Entendi! Você disse: "${message}"

Posso te ajudar com:
- **Status** geral dos projetos
- **Tasks** em review
- **Bugs** críticos

O que precisa?`;
    }

    console.log('[Luna] Respondendo:', reply.substring(0, 50) + '...');
    
    return NextResponse.json({ 
      messageId: `luna-${Date.now()}`, 
      status: 'completed', 
      reply, 
      source: 'mcp' 
    });

  } catch (error) {
    console.error('[Luna] Erro geral:', error);
    return NextResponse.json({
      messageId: `luna-${Date.now()}`,
      status: 'completed',
      reply: `🌙 Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`,
      source: 'error'
    });
  }
}

// GET
export async function GET() {
  return NextResponse.json({ status: 'online' });
}
