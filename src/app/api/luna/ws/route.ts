import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';

const GATEWAY_URL = 'ws://127.0.0.1:18789';
const GATEWAY_TOKEN = '25fed3a735cf5e6ec6c436195212d42d1edeba64ddc17b90b823069d58cd52bb';
const AGENT_ID = 'main';

// POST - Enviar mensagem via WebSocket
export async function POST(request: NextRequest) {
  const { message } = await request.json();
  
  if (!message) {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  return new Promise((resolve) => {
    let response = '';
    let timeout: NodeJS.Timeout;
    const ws = new WebSocket(GATEWAY_URL);

    timeout = setTimeout(() => {
      ws.close();
      resolve(NextResponse.json({
        messageId: `luna-timeout-${Date.now()}`,
        status: 'completed', 
        reply: '🌙 Timeout - Gateway não respondeu.',
        source: 'timeout'
      }));
    }, 90000);

    ws.on('open', () => {
      // Autenticar
      ws.send(JSON.stringify({
        type: 'auth',
        token: GATEWAY_TOKEN,
        agentId: AGENT_ID
      }));

      // Enviar mensagem após autenticação
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'message',
          content: message,
          agentId: AGENT_ID
        }));
      }, 500);
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log('[Luna WS] Recebido:', msg.type);
        
        // Texto da resposta
        if (msg.type === 'text' || msg.type === 'content') {
          response += msg.text || msg.content || '';
        }
        
        // Streaming
        if (msg.type === 'delta' || msg.type === 'text_delta') {
          response += msg.delta || msg.text || '';
        }
        
        // Finalizado
        if (msg.type === 'done' || msg.type === 'complete' || msg.done) {
          clearTimeout(timeout);
          ws.close();
          resolve(NextResponse.json({
            messageId: `luna-${Date.now()}`,
            status: 'completed',
            reply: response || '🌙 Recebi!',
            source: 'gateway'
          }));
        }

        // Mensagem completa
        if (msg.type === 'message' && msg.content) {
          response = msg.content;
        }

        // Erro
        if (msg.type === 'error') {
          clearTimeout(timeout);
          ws.close();
          resolve(NextResponse.json({
            messageId: `luna-error-${Date.now()}`,
            status: 'completed',
            reply: `🌙 Erro: ${msg.message || msg.error || 'Erro desconhecido'}`,
            source: 'error'
          }));
        }
      } catch (e) {
        // Texto puro
        response += data.toString();
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[Luna WS] Erro:', error);
      resolve(NextResponse.json({
        messageId: `luna-ws-error-${Date.now()}`,
        status: 'completed',
        reply: `🌙 Erro de conexão WebSocket. Verifica se o Gateway está rodando.`,
        source: 'error'
      }));
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      if (response) {
        resolve(NextResponse.json({
          messageId: `luna-${Date.now()}`,
          status: 'completed',
          reply: response,
          source: 'gateway'
        }));
      }
    });
  });
}

// GET - Status da conexão
export async function GET() {
  return new Promise((resolve) => {
    const ws = new WebSocket(GATEWAY_URL);
    
    ws.on('open', () => {
      ws.close();
      resolve(NextResponse.json({ status: 'online', gateway: GATEWAY_URL }));
    });
    
    ws.on('error', () => {
      resolve(NextResponse.json({ status: 'offline', gateway: GATEWAY_URL }));
    });
  });
}
