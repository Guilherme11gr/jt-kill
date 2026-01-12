'use client';

import { useState } from 'react';
import { History, Bot, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ActivityItem } from '@/lib/query/hooks/use-dashboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ActivityDetailModal } from './activity-detail-modal';

interface ActivityBlockProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

/**
 * ActivityBlock - Bloco "Atividade Recente" da dashboard
 * 
 * Feed humanizado de mudanças recentes em tasks do usuário,
 * feitas por outras pessoas.
 */
export function ActivityBlock({ activities, isLoading }: ActivityBlockProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Se não houver atividades, mostra estado vazio
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <p className="text-sm">Nenhuma atividade recente da equipe</p>
            <p className="text-xs opacity-70 mt-1">As suas ações não aparecem aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          Atividade Recente
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            {activities.length} {activities.length === 1 ? 'atualização' : 'atualizações'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {activities.map((activity) => (
            <ActivityRow 
              key={activity.id} 
              activity={activity} 
              onShowDetails={() => setSelectedActivity(activity)}
            />
          ))}
        </div>
      </CardContent>

      {/* Modal de detalhes */}
      <ActivityDetailModal
        activity={selectedActivity}
        open={selectedActivity !== null}
        onClose={() => setSelectedActivity(null)}
      />
    </Card>
  );
}

interface ActivityRowProps {
  activity: ActivityItem;
  onShowDetails: () => void;
}

function ActivityRow({ activity, onShowDetails }: ActivityRowProps) {
  const timeAgo = getTimeAgo(new Date(activity.createdAt));
  const metadata = activity.metadata as Record<string, unknown> | null;
  const isAgent = metadata?.source === 'agent';
  const agentName = metadata?.agentName as string | undefined;
  const hasRichMetadata = !!(metadata?.changeReason || metadata?.aiReasoning);

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 p-2 rounded-lg transition-colors group',
        'hover:bg-accent/50 cursor-pointer'
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={activity.actorAvatar || undefined} alt={activity.actorName || '?'} />
        <AvatarFallback className={cn(
          "text-xs",
          isAgent ? "bg-purple-500/20 text-purple-500" : "bg-primary/10 text-primary"
        )}>
          {isAgent ? '🤖' : getInitials(activity.actorName)}
        </AvatarFallback>
      </Avatar>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          {activity.humanMessage}
        </p>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Badge de IA */}
          {isAgent && (
            <Badge 
              variant="secondary" 
              className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 text-[10px] px-1.5 py-0"
            >
              <Bot className="h-3 w-3 mr-0.5" />
              {agentName || 'IA'}
            </Badge>
          )}
          {activity.projectName && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {activity.projectName}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {timeAgo}
          </span>
          {/* Indicador de mais detalhes */}
          {hasRichMetadata && (
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-3 w-3" />
              detalhes
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // Clicar abre modal de detalhes, não navega mais para task
  return (
    <div onClick={onShowDetails} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onShowDetails()}>
      {content}
    </div>
  );
}

/**
 * Extrai iniciais do nome
 */
function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Formata tempo relativo
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  return `há ${Math.floor(diffHours / 24)}d`;
}
