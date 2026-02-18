import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infra/adapters/prisma';
import { randomUUID } from 'crypto';

// GET - Polling para verificar resposta
export async function GET(request: NextRequest) {
  const messageId = request.nextUrl.searchParams.get('messageId');
  
  if (!messageId) {
    return NextResponse.json({ error: 'messageId required' }, { status: 400 });
  }

  try {
    // Busca mensagem no banco
    const message = await prisma.kaiMessage.findFirst({
      where: { id: messageId }
    });

    if (!message) {
      return NextResponse.json({ 
        status: 'pending',
        reply: 'Aguardando processamento...'
      });
    }

    return NextResponse.json({
      status: message.status || 'completed',
      reply: message.reply || message.content,
      metadata: {
        // Metadata será preenchida quando Luna processar
      }
    });
  } catch (error) {
    console.error('Erro ao buscar mensagem:', error);
    return NextResponse.json({ 
      status: 'error',
      reply: 'Erro ao buscar resposta'
    }, { status: 500 });
  }
}

// POST - Enviar mensagem para Luna
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, userId, messageId } = body;

    if (!message) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    // Gera ID único para a mensagem
    const msgId = messageId || randomUUID();

    // Salva mensagem no banco (reutilizando tabela KaiMessage)
    await prisma.kaiMessage.create({
      data: {
        id: msgId,
        userId: userId || 'guilherme',
        content: message,
        direction: 'incoming',
        status: 'pending'
      }
    });

    // Processar mensagem via Gateway ou MCP
    setTimeout(async () => {
      try {
        // Tentar chamar gateway primeiro
        const gatewayRes = await fetch('http://localhost:3005/api/luna/gateway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            userId: userId || 'guilherme',
            messageId: msgId
          })
        });

        const data = await gatewayRes.json();
        const reply = data.reply || generateSimulatedReply(message);
        
        // Atualizar mensagem com resposta
        await prisma.kaiMessage.update({
          where: { id: msgId },
          data: {
            reply,
            status: 'completed'
          }
        });
      } catch (err) {
        console.error('Erro ao processar mensagem:', err);
        // Fallback
        const reply = generateSimulatedReply(message);
        await prisma.kaiMessage.update({
          where: { id: msgId },
          data: {
            reply,
            status: 'completed'
          }
        });
      }
    }, 1500);

    return NextResponse.json({
      messageId: msgId,
      status: 'pending'
    });

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return NextResponse.json({ 
      error: 'Erro ao enviar mensagem' 
    }, { status: 500 });
  }
}

// Resposta simulada (será substituída por chamada real ao OpenClaw)
function generateSimulatedReply(message: string): string {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('status') || lowerMsg.includes('como estão')) {
    return `🌙 **Status Geral dos Projetos**

**Agenda Aqui (AGQ):**
- 324 tasks • 7 epics
- 5 tasks em REVIEW aguardando aprovação
- 🚨 1 bug CRITICAL: AGQ-339

**Jira Killer (JKILL):**
- 191 tasks • 6 epics
- 2 bugs CRITICAL em REVIEW (paywall bypass)
- Real-time Enterprise System em progresso

**Lojinha (LOJINHA):**
- 148 tasks • 5 epics
- Em pré-lançamento

**Recomendação:** Priorizar os bugs CRITICAL do JKILL (paywall bypass é crítico de segurança).

Quer que eu detalhe algum projeto específico?`;
  }
  
  if (lowerMsg.includes('task') || lowerMsg.includes('focar') || lowerMsg.includes('prior')) {
    return `🌙 **Tasks Prioritárias para Hoje**

1. **JKILL-260** (CRITICAL) - Auth callback bypass do paywall
   → Bug de segurança, precisa de fix imediato

2. **JKILL-259** (CRITICAL) - Rota /api/subscriptions/status 404
   → Bloqueando checkout

3. **AGQ-340** - Galeria/Portfólio no onboarding
   → Em REVIEW, aguardando aprovação

Posso criar uma task nova ou atualizar status de alguma dessas. O que prefere?`;
  }
  
  if (lowerMsg.includes('bug') || lowerMsg.includes('crítico') || lowerMsg.includes('bloqueio')) {
    return `🌙 **Bugs Críticos Identificados**

**🚨 JKILL-260** - Auth callback bypass do paywall
- Prioridade: CRITICAL
- Status: REVIEW
- Impacto: Usuários podem acessar sem pagar
- **Ação recomendada:** Merge imediato após review

**🚨 JKILL-259** - Rota 404 no checkout
- Prioridade: CRITICAL  
- Status: REVIEW
- Impacto: Usuários travados no checkout
- **Ação recomendada:** Deploy de hotfix

Quer que eu crie tasks de follow-up ou atualize o status dessas?`;
  }
  
  if (lowerMsg.includes('criar') || lowerMsg.includes('nova task')) {
    return `🌙 **Modo Criação de Task Ativado**

Pronta! Me descreva a task que você quer criar. Vou estruturar pra você:

**Exemplo de formato:**
- Título claro
- Descrição técnica
- Critérios de aceite
- Prioridade sugerida
- Epic/Feature relacionado

Pode mandar! 🌙`;
  }
  
  // Resposta padrão
  return `🌙 Entendi sua mensagem!

Posso te ajudar com:
- **Status geral** dos projetos
- **Priorização** de tasks
- **Identificação** de bugs e bloqueios
- **Criação** de novas tasks

Me diz o que precisa! Tenho acesso ao MCP do JT-KILL, então posso criar, atualizar e analisar suas tasks em tempo real.`;
}
