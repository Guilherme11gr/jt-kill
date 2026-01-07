'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { useCreateNote, useUpdateNote, type ProjectNote } from '@/lib/query/hooks/use-project-notes';
import { Loader2, Lightbulb } from 'lucide-react';

interface NoteEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  note?: ProjectNote | null;
}

/**
 * Modal for creating/editing project notes (ideas)
 */
export function NoteEditorModal({
  open,
  onOpenChange,
  projectId,
  note,
}: NoteEditorModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const createNote = useCreateNote();
  const updateNote = useUpdateNote(projectId);

  const isEditing = !!note;
  const isPending = createNote.isPending || updateNote.isPending;

  // Reset form when opening/note changes
  useEffect(() => {
    if (open) {
      if (note) {
        setTitle(note.title);
        setContent(note.content);
      } else {
        setTitle('');
        setContent('');
      }
    }
  }, [open, note]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    if (isEditing && note) {
      updateNote.mutate(
        { id: note.id, title, content },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createNote.mutate(
        { projectId, title, content },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 rounded">
              <Lightbulb className="size-4 text-amber-500" />
            </div>
            <DialogTitle>
              {isEditing ? 'Editar Ideia' : 'Nova Ideia'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? 'Edite o conteúdo da sua ideia.'
              : 'Capture uma nova ideia para o projeto.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="note-title" className="text-sm font-medium">
              Título *
            </Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Uma breve descrição da ideia"
              required
              className="text-base"
              disabled={isPending}
              autoFocus
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Detalhes (Markdown)</Label>
            <MarkdownEditor
              id="note-content"
              value={content}
              onChange={setContent}
              placeholder="# Descrição&#10;&#10;Detalhe sua ideia aqui...&#10;&#10;## Benefícios&#10;- ...&#10;&#10;## Considerações&#10;- ..."
              minHeight="300px"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                'Salvar Alterações'
              ) : (
                'Criar Ideia'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
