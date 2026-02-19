import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';

// Cache do processo RPC para reutilizar
let rpcProcess: ChildProcess | null = null;
let messageId = 0;

// Garantir que o processo RPC está rodando
function getRpcProcess(): ChildProcess {
  if (rpcProcess && !rpcProcess.killed) {
    return rpcProcess;
  }

  // Spawn do agente em modo RPC
  rpcProcess = spawn('openclaw', ['--mode', 'rpc'], {
    cwd: '/workspace/main',
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  rpcProcess.on('error', (err) => {
    console.error('[Luna RPC] Process error:', err);
    rpcProcess = null;
  });

  rpcProcess.on('exit', () => {
    console.log('[Luna RPC] Process exited');
    rpcProcess = null;
  });

  return rpcProcess;
}

// POST - Enviar mensagem e receber resposta
export async function POST(request: NextRequest) {
  const { message } = await request.json();
  
  if (!message) {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  return new Promise((resolve) => {
    let response = '';
    let timeout: NodeJS.Timeout;
    
    try {
      const proc = getRpcProcess();
      
      timeout = setTimeout(() => {
        resolve(NextResponse.json({
          messageId: `luna-timeout-${Date.now()}`,
          status: 'completed',
          reply: '🌙 Timeout - não recebi resposta. Tenta de novo?',
          source: 'timeout'
        }));
      }, 60000);

      // Coletar resposta do stdout
      const onData = (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            
            // Texto da resposta
            if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
              response += event.assistantMessageEvent.delta;
            }
            
            // Agente terminou
            if (event.type === 'agent_end') {
              clearTimeout(timeout);
              proc.stdout?.off('data', onData);
              
              resolve(NextResponse.json({
                messageId: `luna-${Date.now()}`,
                status: 'completed',
                reply: response || '🌙 Pronto!',
                source: 'rpc'
              }));
            }
          } catch {
            // Ignora linhas não-JSON
          }
        }
      };

      proc.stdout?.on('data', onData);

      // Enviar comando RPC
      const cmd = JSON.stringify({
        id: `msg-${++messageId}`,
        type: 'prompt',
        message
      }) + '\n';
      
      proc.stdin?.write(cmd);

    } catch (error) {
      clearTimeout(timeout);
      console.error('[Luna RPC] Erro:', error);
      
      resolve(NextResponse.json({
        messageId: `luna-error-${Date.now()}`,
        status: 'completed',
        reply: `🌙 Erro ao conectar: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n\nVerifica se o OpenClaw Gateway está rodando.`,
        source: 'error'
      }));
    }
  });
}

// GET - Status
export async function GET() {
  return NextResponse.json({
    status: rpcProcess && !rpcProcess.killed ? 'connected' : 'disconnected',
    mode: 'rpc'
  });
}
