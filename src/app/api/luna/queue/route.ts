import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infra/adapters/prisma';
import { randomUUID } from 'crypto';

// Reutilizar tabela KaiMessage para Luna

// POST - Enviar mensagem
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const messageId = randomUUID();
    
    // Salvar mensagem no banco
    await prisma.kaiMessage.create({
      data: {
        id: messageId,
        userId: 'luna-hub',
        content: message,
        direction: 'incoming',
        status: 'pending'
      }
    });

    return NextResponse.json({
      messageId,
      status: 'pending',
      reply: '🌙 Mensagem enviada! Luna vai responder em breve...',
      source: 'queue'
    });

  } catch (error) {
    console.error('[Luna Queue] Erro:', error);
    return NextResponse.json({
      messageId: `error-${Date.now()}`,
      status: 'error',
      reply: `🌙 Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      source: 'error'
    });
  }
}

// GET - Verificar resposta
export async function GET(request: NextRequest) {
  const messageId = request.nextUrl.searchParams.get('messageId');
  
  if (!messageId) {
    return NextResponse.json({ error: 'messageId required' }, { status: 400 });
  }

  try {
    const msg = await prisma.kaiMessage.findUnique({
      where: { id: messageId }
    });

    if (!msg) {
      return NextResponse.json({
        status: 'pending',
        reply: 'Aguardando...'
      });
    }

    return NextResponse.json({
      status: msg.status || (msg.reply ? 'completed' : 'pending'),
      reply: msg.reply || msg.content
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      reply: 'Erro ao verificar resposta'
    });
  }
}
