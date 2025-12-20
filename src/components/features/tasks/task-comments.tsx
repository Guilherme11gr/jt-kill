'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { UserAvatar } from '@/components/features/shared';
import { useComments, useAddComment, useDeleteComment, type Comment } from '@/lib/query/hooks/use-comments';
import { Loader2, Send, Trash2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskCommentsProps {
  taskId: string;
  className?: string;
}

/**
 * Comments section for tasks
 * Shows list of comments with add form
 */
export function TaskComments({ taskId, className }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: comments = [], isLoading, isFetching } = useComments(taskId);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment(taskId);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newComment.trim()) return;

    addComment.mutate(
      { taskId, content: newComment.trim() },
      { onSuccess: () => setNewComment('') }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDelete = (commentId: string) => {
    // Ideally use a custom confirmation dialog, keeping confirm for simplicity but styled triggers
    if (confirm('Excluir este comentário?')) {
      deleteComment.mutate(commentId);
    }
  };

  const formatDate = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <MessageSquare className="size-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">
          Comentários
        </h3>
        {comments.length > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {comments.length}
          </span>
        )}
        {isFetching && !isLoading && (
          <Loader2 className="size-3 animate-spin text-muted-foreground ml-auto" />
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 -mr-2">
        {isLoading ? (
          // Skeleton Loading
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="size-8 rounded-full bg-muted/60 animate-pulse shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-muted/60 rounded animate-pulse" />
                <div className="h-16 w-full bg-muted/40 rounded-lg animate-pulse" />
              </div>
            </div>
          ))
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 bg-muted/10 rounded-xl border border-dashed">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Nenhum comentário</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Inicie a conversa sobre esta tarefa ou deixe uma observação.
              </p>
            </div>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="group flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <UserAvatar
                displayName={comment.user?.displayName}
                avatarUrl={comment.user?.avatarUrl}
                userId={comment.userId}
                size="md"
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {comment.user?.displayName || 'Usuário'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive -mr-2"
                    onClick={() => handleDelete(comment.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>

                <div className="relative bg-muted/30 p-3 rounded-lg rounded-tl-none text-sm text-foreground/90 whitespace-pre-wrap break-words border ring-1 ring-transparent group-hover:ring-border transition-all">
                  {comment.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      <div className="relative">
        <div className="flex gap-3">
          <UserAvatar size="md" className="hidden sm:flex mt-1" /> {/* Current user placeholder if available would be better */}
          <div className="flex-1 relative group rounded-xl border bg-background focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-primary transition-all">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escreva um comentário... (Enter para enviar)"
              className="min-h-[48px] max-h-[200px] resize-none border-0 focus-visible:ring-0 bg-transparent py-3 px-4 shadow-none pr-12"
              disabled={addComment.isPending}
            />
            <div className="absolute bottom-1.5 right-1.5">
              <Button
                size="icon"
                type="button"
                className={cn(
                  "size-8 rounded-lg transition-all",
                  newComment.trim() ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                )}
                disabled={!newComment.trim() || addComment.isPending}
                onClick={() => handleSubmit()}
              >
                {addComment.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 ml-1 text-right sm:text-left sm:ml-12 opacity-0 focus-within:opacity-70 transition-opacity">
          Pressione Enter para enviar, Shift + Enter para nova linha
        </p>
      </div>
    </div>
  );
}
