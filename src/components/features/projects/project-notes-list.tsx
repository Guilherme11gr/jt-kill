'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  useProjectNotes,
  useDeleteNote,
  useArchiveNote,
  type ProjectNote,
  type NoteStatus,
} from '@/lib/query/hooks/use-project-notes';
import {
  Loader2,
  Plus,
  Lightbulb,
  Trash2,
  Pencil,
  Clock,
  Archive,
  ArchiveRestore,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NoteEditorModal } from './note-editor-modal';
import { ConvertNoteModal } from './convert-note-modal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProjectNotesListProps {
  projectId: string;
  className?: string;
}

/**
 * Project notes (ideas) list
 * Shows all notes with create/edit/delete/archive/convert functionality
 */
export function ProjectNotesList({ projectId, className }: ProjectNotesListProps) {
  const [editingNote, setEditingNote] = useState<ProjectNote | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<ProjectNote | null>(null);
  const [noteToArchive, setNoteToArchive] = useState<ProjectNote | null>(null);
  const [noteToConvert, setNoteToConvert] = useState<ProjectNote | null>(null);

  const { data: notes = [], isLoading, isFetching } = useProjectNotes(projectId);
  const deleteNote = useDeleteNote(projectId);
  const archiveNote = useArchiveNote(projectId);

  // Filter notes by status
  const filteredNotes = useMemo(() => {
    if (showArchived) {
      return notes.filter(note => note.status === 'ARCHIVED' || note.status === 'CONVERTED');
    }
    return notes.filter(note => note.status === 'ACTIVE');
  }, [notes, showArchived]);

  const archivedCount = useMemo(() =>
    notes.filter(n => n.status === 'ARCHIVED' || n.status === 'CONVERTED').length,
    [notes]);

  const activeCount = useMemo(() =>
    notes.filter(n => n.status === 'ACTIVE').length,
    [notes]);

  const formatDate = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  const getPreviewContent = (content: string) => {
    // Remove markdown formatting for preview
    return content
      .replace(/#+\s/g, '')
      .replace(/[\*_~`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .substring(0, 150);
  };

  const handleDelete = () => {
    if (noteToDelete) {
      deleteNote.mutate(noteToDelete.id);
      setNoteToDelete(null);
    }
  };

  const handleArchive = () => {
    if (noteToArchive) {
      archiveNote.mutate({ id: noteToArchive.id, unarchive: false });
      setNoteToArchive(null);
    }
  };

  const handleUnarchive = (note: ProjectNote) => {
    archiveNote.mutate({ id: note.id, unarchive: true });
  };

  const getStatusBadge = (note: ProjectNote) => {
    if (note.status === 'CONVERTED') {
      return (
        <Badge variant="outline-success" className="text-[10px] gap-1">
          <Sparkles className="size-3" />
          Convertida
        </Badge>
      );
    }
    if (note.status === 'ARCHIVED') {
      return (
        <Badge variant="outline" className="text-[10px] gap-1">
          <Archive className="size-3" />
          Arquivada
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Lightbulb className="size-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Ideias</h2>
              <p className="text-xs text-muted-foreground">
                Capture e organize ideias para o projeto
              </p>
            </div>
            {isFetching && !isLoading && (
              <Loader2 className="size-4 animate-spin text-muted-foreground ml-2" />
            )}
          </div>
          <Button
            onClick={() => setIsCreating(true)}
            size="sm"
            className="shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Plus className="size-4 mr-2" />
            Nova Ideia
          </Button>
        </div>

        {/* Filter Toggle */}
        {notes.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant={!showArchived ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowArchived(false)}
              className="gap-1.5"
            >
              <Lightbulb className="size-3.5" />
              Ativas ({activeCount})
            </Button>
            <Button
              variant={showArchived ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowArchived(true)}
              className="gap-1.5"
            >
              <Archive className="size-3.5" />
              Arquivadas ({archivedCount})
            </Button>
          </div>
        )}
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        // Skeleton Grid
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-[180px] animate-pulse">
              <CardHeader className="pb-2 space-y-2">
                <div className="h-5 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-2/3 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title={showArchived ? 'Nenhuma ideia arquivada' : 'Nenhuma ideia ainda'}
          description={
            showArchived
              ? 'Ideias arquivadas e convertidas aparecerão aqui.'
              : 'Comece capturando suas ideias para o projeto.'
          }
          action={
            !showArchived && (
              <Button onClick={() => setIsCreating(true)} size="default">
                Criar primeira ideia
              </Button>
            )
          }
          className="border-dashed bg-muted/5 animate-in fade-in zoom-in-95 duration-500"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note: ProjectNote, index: number) => (
            <Card
              key={note.id}
              className="h-full overflow-hidden hover:shadow-sm hover:border-primary/50 transition-all duration-300 border-border bg-card hover:bg-accent/5 group cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setEditingNote(note)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                        {note.title}
                      </CardTitle>
                      {getStatusBadge(note)}
                    </div>
                    <CardDescription className="flex items-center gap-1 text-[10px] sm:text-xs">
                      <Clock className="size-3" />
                      {formatDate(note.updatedAt)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {note.status === 'ACTIVE' && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 hover:bg-primary/10 hover:text-primary rounded-full"
                          onClick={() => setEditingNote(note)}
                          title="Editar"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 hover:bg-amber-500/10 hover:text-amber-500 rounded-full"
                          onClick={() => setNoteToConvert(note)}
                          title="Transformar em Feature"
                        >
                          <Sparkles className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 hover:bg-muted rounded-full"
                          onClick={() => setNoteToArchive(note)}
                          title="Arquivar"
                        >
                          <Archive className="size-3.5" />
                        </Button>
                      </>
                    )}
                    {note.status === 'ARCHIVED' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 hover:bg-muted rounded-full"
                        onClick={() => handleUnarchive(note)}
                        title="Restaurar"
                      >
                        <ArchiveRestore className="size-3.5" />
                      </Button>
                    )}
                    {note.status !== 'CONVERTED' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 hover:bg-destructive/10 hover:text-destructive rounded-full"
                        onClick={() => setNoteToDelete(note)}
                        title="Excluir"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {note.content ? (
                    getPreviewContent(note.content)
                  ) : (
                    <span className="italic opacity-50">Sem conteúdo</span>
                  )}
                </p>
                {note.status === 'CONVERTED' && note.convertedToFeature && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary">
                    <ExternalLink className="size-3" />
                    <span>Convertida: {note.convertedToFeature.title}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <NoteEditorModal
        open={isCreating || !!editingNote}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setIsCreating(false);
            setEditingNote(null);
          }
        }}
        projectId={projectId}
        note={editingNote}
      />

      {/* Convert Modal */}
      <ConvertNoteModal
        open={!!noteToConvert}
        onOpenChange={(open) => !open && setNoteToConvert(null)}
        projectId={projectId}
        note={noteToConvert}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ideia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A ideia &quot;{noteToDelete?.title}&quot; será
              permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!noteToArchive} onOpenChange={(open) => !open && setNoteToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar ideia?</AlertDialogTitle>
            <AlertDialogDescription>
              A ideia &quot;{noteToArchive?.title}&quot; será movida para a aba de arquivadas.
              Você poderá restaurá-la depois se precisar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
