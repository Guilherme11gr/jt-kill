'use client';

import { useState, useMemo } from 'react';
import { FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProjectDocs } from '@/lib/query/hooks/use-project-docs';

interface DocContextSelectorProps {
  projectId: string;
  selectedDocIds: string[];
  onSelectionChange: (docIds: string[]) => void;
  disabled?: boolean;
}

/**
 * Multi-select popover for choosing project documents as AI context.
 * Simple, clean UI similar to TagSelector pattern.
 */
export function DocContextSelector({
  projectId,
  selectedDocIds,
  onSelectionChange,
  disabled = false,
}: DocContextSelectorProps) {
  // ✅ Add state control to fix popover not closing properly
  const [open, setOpen] = useState(false);
  
  const { data: docs = [], isLoading } = useProjectDocs(projectId);

  const selectedSet = useMemo(
    () => new Set(selectedDocIds),
    [selectedDocIds]
  );

  const allSelected = docs.length > 0 && selectedDocIds.length === docs.length;
  const someSelected = selectedDocIds.length > 0 && !allSelected;

  const toggleDoc = (docId: string) => {
    if (selectedSet.has(docId)) {
      onSelectionChange(selectedDocIds.filter(id => id !== docId));
    } else {
      onSelectionChange([...selectedDocIds, docId]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(docs.map(d => d.id));
    }
  };

  // Don't render if no project or disabled with no docs
  if (!projectId) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || isLoading}
          className={cn(
            "h-7 px-2 text-xs gap-1.5",
            selectedDocIds.length > 0
              ? "text-violet-600 dark:text-violet-400"
              : "text-muted-foreground"
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{selectedDocIds.length} docs</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-2 z-[9999] overflow-hidden" align="end">
        <div className="space-y-2">
          {/* Header with select all */}
          {docs.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors border-b pb-2 -mx-2"
            >
              <div className={cn(
                "w-4 h-4 rounded border flex items-center justify-center",
                allSelected && "bg-violet-600 border-violet-600",
                someSelected && "bg-violet-600/50 border-violet-600"
              )}>
                {(allSelected || someSelected) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <span className="flex-1 text-left font-medium">
                {allSelected ? 'Limpar seleção' : 'Selecionar todos'}
              </span>
              <span className="text-xs text-muted-foreground">
                {docs.length} docs
              </span>
            </button>
          )}

          {/* Documents list */}
          <ScrollArea className="max-h-48">
            {isLoading ? (
              <div className="text-sm text-muted-foreground p-2">
                Carregando...
              </div>
            ) : docs.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2">
                Nenhum documento neste projeto
              </div>
            ) : (
              <div className="space-y-0.5">
                {docs.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      toggleDoc(doc.id);
                      // Auto-close on selection for better UX
                      if (!selectedSet.has(doc.id)) {
                        setTimeout(() => setOpen(false), 150);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors',
                      selectedSet.has(doc.id) && 'bg-accent/50'
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                      selectedSet.has(doc.id)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/50"
                    )}>
                      {selectedSet.has(doc.id) && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                    <span className="flex-1 text-left truncate">
                      {doc.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
