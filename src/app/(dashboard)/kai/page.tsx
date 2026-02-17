'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2, 
  BarChart3, 
  Zap,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'chat' | 'analysis' | 'action';
}

interface QuickAction {
  label: string;
  prompt: string;
  icon: React.ReactNode;
}

const quickActions: QuickAction[] = [
  { 
    label: 'Análise do dia', 
    prompt: 'Faça uma análise dos meus projetos hoje. O que está crítico?',
    icon: <BarChart3 className="w-4 h-4" />
  },
  { 
    label: 'Tasks prioritárias', 
    prompt: 'Quais são as 3 tasks mais importantes pra eu fazer agora?',
    icon: <Zap className="w-4 h-4" />
  },
  { 
    label: 'Bloqueios', 
    prompt: 'Tem alguma task travada que precisa de atenção?',
    icon: <MessageSquare className="w-4 h-4" />
  },
];

export default function KaiZonePage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Olá! Sou o Kai, seu assistente no Jira Killer.\n\nPosso te ajudar com:\n• Análise de projetos e tasks\n• Priorização do que fazer\n• Identificar bloqueios\n• Documentar decisões\n\nO que você precisa hoje?`,
      timestamp: new Date(),
      type: 'chat'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll pro final
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // TODO: Integrar com MCP pra respostas reais
    // Por enquanto, simula resposta
    setTimeout(() => {
      const kaiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateResponse(input),
        timestamp: new Date(),
        type: 'chat'
      };
      setMessages(prev => [...prev, kaiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleQuickAction = (action: QuickAction) => {
    setInput(action.prompt);
  };

  // Simulação de resposta (vai ser substituída por integração real)
  const generateResponse = (userInput: string): string => {
    const lower = userInput.toLowerCase();
    if (lower.includes('análise') || lower.includes('projetos')) {
      return `📊 **Análise dos Projetos**\n\n**Agenda Aqui:** 324 tasks, 3 críticas\n**Lojinha:** 148 tasks, fluindo bem\n**Jira Killer:** 191 tasks, 2 travadas\n\n**Prioridade:** Focar nas tasks críticas do Agenda Aqui hoje.`;
    }
    if (lower.includes('prioridade') || lower.includes('importante')) {
      return `🎯 **Top 3 Prioridades**\n\n1. **AGQ-331** - Bug de timezone (CRÍTICO)\n2. **AGQ-327** - Leak de token (CRÍTICO)\n3. **LOJ-124** - Checkout multi-produto (HIGH)\n\nQuer que eu detalhe alguma?`;
    }
    if (lower.includes('bloqueio') || lower.includes('travada')) {
      return `🚫 **Bloqueios Atuais**\n\n**Agenda Aqui:** 1 task travada\n- AGQ-??? - dependência externa\n\n**Jira Killer:** 2 tasks travadas\n- Revisão de arquitetura pendente\n\nPosso ajudar a desbloquear?`;
    }
    return `Entendi. Estou processando isso...\n\n*(Integração completa com MCP em desenvolvimento)*`;
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kai Zone</h1>
            <p className="text-sm text-muted-foreground">
              Seu assistente inteligente no Jira Killer
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="w-3 h-3" />
          Beta
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 h-full">
        {/* Chat Principal */}
        <Card className="lg:col-span-2 flex flex-col h-full">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4" />
              Conversa com Kai
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Mensagens */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                        message.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className={cn(
                        "text-xs mt-1",
                        message.role === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Kai está pensando...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Pergunte algo sobre seus projetos..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar de Ações */}
        <div className="space-y-4">
          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleQuickAction(action)}
                >
                  {action.icon}
                  {action.label}
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status dos Projetos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Agenda Aqui</span>
                <Badge variant="destructive">324 tasks</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Lojinha</span>
                <Badge variant="default">148 tasks</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Jira Killer</span>
                <Badge variant="secondary">191 tasks</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Content Creator</span>
                <Badge variant="outline">18 tasks</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 text-xs text-muted-foreground space-y-2">
              <p>💡 <strong>Dica:</strong> Use o MCP para integração completa.</p>
              <p>🔧 <strong>Em breve:</strong> Delegação automática de tasks.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
