'use client';

import { History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ActivityItem } from '@/lib/query/hooks/use-dashboard';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

  // Se não houver atividades, não renderiza o bloco
  if (activities.length === 0) {
    return null;
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
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ActivityRowProps {
  activity: ActivityItem;
}

function ActivityRow({ activity }: ActivityRowProps) {
  const timeAgo = getTimeAgo(new Date(activity.createdAt));

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 p-2 rounded-lg transition-colors',
        activity.targetId && 'hover:bg-accent/50 cursor-pointer'
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={activity.actorAvatar || undefined} alt={activity.actorName || '?'} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {getInitials(activity.actorName)}
        </AvatarFallback>
      </Avatar>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          {activity.humanMessage}
        </p>

        <div className="flex items-center gap-2 mt-1">
          {activity.projectName && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {activity.projectName}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {timeAgo}
          </span>
        </div>
      </div>
    </div>
  );

  if (activity.targetId) {
    return (
      <Link href={`/tasks?task=${activity.targetId}`}>
        {content}
      </Link>
    );
  }

  return content;
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
