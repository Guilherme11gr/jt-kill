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
import { useCreateDoc, useUpdateDoc, type ProjectDoc } from '@/lib/query/hooks/use-project-docs';
import { Loader2 } from 'lucide-react';

interface DocEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  doc?: ProjectDoc | null;
}

/**
 * Modal for creating/editing project documents
 */
export function DocEditorModal({
  open,
  onOpenChange,
  projectId,
  doc,
}: DocEditorModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const createDoc = useCreateDoc();
  const updateDoc = useUpdateDoc(projectId);

  const isEditing = !!doc;
  const isPending = createDoc.isPending || updateDoc.isPending;

  // Reset form when opening/doc changes
  useEffect(() => {
    if (open) {
      if (doc) {
        setTitle(doc.title);
        setContent(doc.content);
      } else {
        setTitle('');
        setContent('');
      }
    }
  }, [open, doc]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    if (isEditing && doc) {
      updateDoc.mutate(
        { id: doc.id, title, content },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createDoc.mutate(
        { projectId, title, content },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Documento' : 'Novo Documento'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Edite o conteúdo do documento.'
              : 'Crie um novo documento para o projeto.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="doc-title" className="text-sm font-medium">
              Título *
            </Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do documento"
              required
              className="text-base"
              disabled={isPending}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Conteúdo (Markdown)</Label>
            <MarkdownEditor
              id="doc-content"
              value={content}
              onChange={setContent}
              placeholder="# Título&#10;&#10;Escreva o conteúdo do documento..."
              minHeight="400px"
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
                'Criar Documento'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
