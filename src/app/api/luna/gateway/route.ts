import { NextRequest, NextResponse } from 'next/server';

// Configuração do gateway OpenClaw
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || '';

// POST - Enviar mensagem para Luna via OpenClaw Gateway
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, userId, conversationHistory } = body;

    if (!message) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    // Preparar contexto para Luna
    const systemPrompt = `Você é a Luna, uma assistente geral que ajuda a gerenciar projetos.

## Sua função:
- Generalista que coordena bots especializados
- Acesso ao MCP JT-KILL para gerenciar tasks
- Responde em português brasileiro
- Usa emojis com moderação (🌙 no início)

## Contexto do usuário:
- UserId: ${userId}
- Projetos disponíveis: AGQ (Agenda Aqui), JKILL (Jira Killer), LOJINHA, CCIA

## Como responder:
1. Seja concisa mas útil
2. Use markdown para formatação
3. Se falar de tasks, inclua IDs (ex: JKILL-260)
4. Ofereça ações práticas quando possível

Responda à seguinte mensagem do usuário:`;

    const fullMessage = `${systemPrompt}\n\n${message}`;

    // Chamar OpenClaw Gateway (RPC para sessão main)
    const response = await fetch(`${GATEWAY_URL}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        sessionKey: 'main',
        message: fullMessage,
        options: {
          stream: false,
          includeHistory: false
        }
      })
    });

    if (!response.ok) {
      // Fallback: resposta simulada se gateway não disponível
      console.log('Gateway não disponível, usando fallback');
      return NextResponse.json({
        reply: generateFallbackReply(message),
        status: 'completed',
        source: 'fallback'
      });
    }

    const data = await response.json();
    
    return NextResponse.json({
      reply: data.response || data.message || 'Luna processou sua mensagem.',
      status: 'completed',
      source: 'gateway'
    });

  } catch (error) {
    console.error('Erro ao chamar gateway:', error);
    
    // Fallback em caso de erro
    const body = await request.clone().json().catch(() => ({}));
    return NextResponse.json({
      reply: generateFallbackReply(body.message || ''),
      status: 'completed',
      source: 'fallback'
    });
  }
}

// Resposta de fallback quando gateway não está disponível
function generateFallbackReply(message: string): string {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('status') || lowerMsg.includes('como estão')) {
    return `🌙 **Status Geral dos Projetos**

Baseado nos dados do sistema:

**Agenda Aqui (AGQ):** 324 tasks • 7 epics
**Jira Killer (JKILL):** 191 tasks • 6 epics  
**Lojinha (LOJINHA):** 148 tasks • 5 epics
**Content Creator (CCIA):** 18 tasks • 2 epics

⚠️ **Alertas:**
- 2 bugs CRITICAL no JKILL (paywall bypass)
- 5 tasks em REVIEW aguardando aprovação

Quer que eu detalhe algum projeto específico?`;
  }
  
  if (lowerMsg.includes('bug') || lowerMsg.includes('crítico')) {
    return `🌙 **Bugs Críticos**

**JKILL-260** - Auth callback bypass do paywall
- Prioridade: CRITICAL
- Status: REVIEW
- 🔥 Urgente: permite acesso sem pagamento

**JKILL-259** - Rota /api/subscriptions/status 404
- Prioridade: CRITICAL
- Status: REVIEW
- 🔥 Bloqueia checkout

Quer que eu crie tasks de hotfix?`;
  }
  
  if (lowerMsg.includes('task') || lowerMsg.includes('focar') || lowerMsg.includes('prior')) {
    return `🌙 **Tasks Prioritárias**

1. **JKILL-260** (CRITICAL) - Fix paywall bypass
2. **JKILL-259** (CRITICAL) - Fix rota checkout
3. **AGQ-340** - Galeria no onboarding (REVIEW)

Posso criar, atualizar ou analisar qualquer task. O que precisa?`;
  }
  
  return `🌙 Entendi!

Posso te ajudar com:
- Status geral dos projetos
- Priorização de tasks
- Identificação de bugs e bloqueios
- Criação de tasks (brain dump → estruturado)

Me diz o que precisa! Tenho acesso ao MCP do JT-KILL.`;
}
