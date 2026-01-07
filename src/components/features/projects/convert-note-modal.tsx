'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConvertNote, type ProjectNote } from '@/lib/query/hooks/use-project-notes';
import { useEpics } from '@/lib/query/hooks/use-epics';
import { Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConvertNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  note: ProjectNote | null;
}

/**
 * Modal for converting a note/idea into a Feature
 */
export function ConvertNoteModal({
  open,
  onOpenChange,
  projectId,
  note,
}: ConvertNoteModalProps) {
  const [selectedEpicId, setSelectedEpicId] = useState<string>('');

  const { data: epics = [], isLoading: epicsLoading } = useEpics(projectId);
  const convertNote = useConvertNote(projectId);

  const isPending = convertNote.isPending;

  // Get available epics
  const availableEpics = epics;

  const handleConvert = async () => {
    if (!note || !selectedEpicId) return;

    convertNote.mutate(
      { noteId: note.id, epicId: selectedEpicId },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedEpicId('');
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedEpicId('');
    }
    onOpenChange(newOpen);
  };

  if (!note) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 rounded">
              <Sparkles className="size-4 text-amber-500" />
            </div>
            <DialogTitle>Transformar em Feature</DialogTitle>
          </div>
          <DialogDescription>
            Converta esta ideia em uma Feature formal no backlog do projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Ideia</span>
              <ArrowRight className="size-3" />
              <span>Feature</span>
            </div>
            <h4 className="font-medium">{note.title}</h4>
            {note.content && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {note.content.replace(/#+\s/g, '').replace(/[\*_~`]/g, '').substring(0, 200)}
                {note.content.length > 200 && '...'}
              </p>
            )}
          </div>

          {/* Epic Selection */}
          <div className="space-y-2">
            <Label htmlFor="epic-select" className="text-sm font-medium">
              Selecione a Epic de destino *
            </Label>
            {epicsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border rounded-md">
                <Loader2 className="size-4 animate-spin" />
                Carregando epics...
              </div>
            ) : availableEpics.length === 0 ? (
              <div className="text-sm text-muted-foreground p-3 border rounded-md border-dashed">
                Nenhuma epic encontrada. Crie uma epic primeiro para converter ideias em features.
              </div>
            ) : (
              <Select value={selectedEpicId} onValueChange={setSelectedEpicId}>
                <SelectTrigger id="epic-select">
                  <SelectValue placeholder="Selecione uma epic..." />
                </SelectTrigger>
                <SelectContent>
                  {availableEpics.map((epic) => (
                    <SelectItem key={epic.id} value={epic.id}>
                      <span className={cn(
                        epic.status === 'CLOSED' && 'text-muted-foreground'
                      )}>
                        {epic.title}
                        {epic.status === 'CLOSED' && ' (Fechada)'}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              A ideia será convertida em uma Feature dentro da Epic selecionada.
              O título e conteúdo da ideia serão usados como título e descrição da Feature.
            </p>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-md">
            <strong>Nota:</strong> Após a conversão, esta ideia será automaticamente arquivada
            e marcada como convertida, mantendo um link para a Feature criada.
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConvert}
              disabled={!selectedEpicId || isPending || availableEpics.length === 0}
              className="gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Convertendo...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Converter em Feature
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
