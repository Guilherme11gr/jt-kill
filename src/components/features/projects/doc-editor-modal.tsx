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
import { TagSelector } from '@/components/features/tags/tag-selector';
import { useCreateDoc, useUpdateDoc, type ProjectDoc } from '@/lib/query/hooks/use-project-docs';
import { Loader2 } from 'lucide-react';
import type { TagInfo } from '@/shared/types/tag.types';

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
  const [selectedTags, setSelectedTags] = useState<TagInfo[]>([]);

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
        // Load existing tags if doc has tags
        setSelectedTags(doc.tags?.map(t => ({
          id: t.tag.id,
          name: t.tag.name,
          color: '#6b7280', // Default gray for doc tags
        })) || []);
      } else {
        setTitle('');
        setContent('');
        setSelectedTags([]);
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

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tags (opcional)</Label>
            <TagSelector
              projectId={projectId}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              disabled={isPending}
              placeholder="Selecionar tags..."
            />
            <p className="text-xs text-muted-foreground">
              Tags ajudam a organizar e filtrar documentos do projeto
            </p>
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
