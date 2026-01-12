'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, User, ArrowRight, Calendar, Lightbulb, MessageSquare, Link2, ExternalLink } from 'lucide-react';
import type { ActivityItem } from '@/lib/query/hooks/use-dashboard';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface ActivityDetailModalProps {
  activity: ActivityItem | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Modal de detalhes da atividade
 * Mostra informações ricas incluindo metadados de agente
 */
export function ActivityDetailModal({ activity, open, onClose }: ActivityDetailModalProps) {
  const router = useRouter();
  
  if (!activity) return null;

  const metadata = activity.metadata as Record<string, unknown> | null;
  const isAgent = metadata?.source === 'agent';
  const agentName = metadata?.agentName as string | undefined;
  const changeReason = metadata?.changeReason as string | undefined;
  const aiReasoning = metadata?.aiReasoning as string | undefined;
  const fromStatus = metadata?.fromStatus as string | undefined;
  const toStatus = metadata?.toStatus as string | undefined;
  const relatedTaskIds = metadata?.relatedTaskIds as string[] | undefined;
  const bulkOperation = metadata?.bulkOperation as boolean | undefined;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAgent ? (
              <Bot className="h-5 w-5 text-purple-500" />
            ) : (
              <User className="h-5 w-5 text-blue-500" />
            )}
            Detalhes da Atividade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Actor + Action */}
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={activity.actorAvatar || undefined} />
              <AvatarFallback className={cn(
                "text-sm",
                isAgent ? "bg-purple-500/20 text-purple-500" : "bg-primary/10 text-primary"
              )}>
                {isAgent ? '🤖' : getInitials(activity.actorName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{activity.actorName}</span>
                {isAgent && (
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20">
                    <Bot className="h-3 w-3 mr-1" />
                    {agentName || 'IA'}
                  </Badge>
                )}
                {bulkOperation && (
                  <Badge variant="outline" className="text-xs">
                    Operação em lote
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activity.humanMessage}
              </p>
            </div>
          </div>

          {/* Target Task */}
          {activity.targetTitle && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Task</div>
              <div className="font-medium">
                {activity.targetReadableId && (
                  <span className="text-muted-foreground mr-2">{activity.targetReadableId}</span>
                )}
                {activity.targetTitle}
              </div>
              {activity.projectName && (
                <div className="text-xs text-muted-foreground mt-1">
                  Projeto: {activity.projectName}
                </div>
              )}
            </div>
          )}

          {/* Status Change Details */}
          {fromStatus && toStatus && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className={getStatusColor(fromStatus)}>
                {formatStatus(fromStatus)}
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className={getStatusColor(toStatus)}>
                {formatStatus(toStatus)}
              </Badge>
            </div>
          )}

          {/* AI Reasoning / Change Reason */}
          {(changeReason || aiReasoning) && (
            <div className="space-y-2">
              {changeReason && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-medium mb-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Motivo da Alteração
                  </div>
                  <p className="text-sm">{changeReason}</p>
                </div>
              )}
              {aiReasoning && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-medium mb-1">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Raciocínio da IA
                  </div>
                  <p className="text-sm">{aiReasoning}</p>
                </div>
              )}
            </div>
          )}

          {/* Related Tasks */}
          {relatedTaskIds && relatedTaskIds.length > 0 && (
            <div className="text-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Link2 className="h-3.5 w-3.5" />
                Tasks Relacionadas
              </div>
              <div className="flex flex-wrap gap-1">
                {relatedTaskIds.map((id) => (
                  <Badge key={id} variant="outline" className="text-xs font-mono">
                    {id.substring(0, 8)}...
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(activity.createdAt).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        {/* Footer com ações */}
        {activity.targetId && (
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                router.push(`/tasks?task=${activity.targetId}`);
                onClose();
              }}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Task
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    BACKLOG: 'Backlog',
    TODO: 'A Fazer',
    DOING: 'Em Andamento',
    REVIEW: 'Em Revisão',
    QA_READY: 'QA',
    DONE: 'Concluído',
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    BACKLOG: 'border-slate-500/50 text-slate-600 dark:text-slate-400',
    TODO: 'border-blue-500/50 text-blue-600 dark:text-blue-400',
    DOING: 'border-amber-500/50 text-amber-600 dark:text-amber-400',
    REVIEW: 'border-purple-500/50 text-purple-600 dark:text-purple-400',
    QA_READY: 'border-cyan-500/50 text-cyan-600 dark:text-cyan-400',
    DONE: 'border-green-500/50 text-green-600 dark:text-green-400',
  };
  return colors[status] || '';
}
