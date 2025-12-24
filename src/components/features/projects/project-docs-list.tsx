'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useProjectDocs, useDeleteDoc, type ProjectDoc } from '@/lib/query/hooks/use-project-docs';
import { useProjectTags, useDocTags } from '@/lib/query/hooks/use-doc-tags';
import { Loader2, Plus, FileText, Trash2, Pencil, Clock, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DocEditorModal } from './doc-editor-modal';
import { DocTagFilter, DocTagBadge, TagManagementModal } from '@/components/features/docs';

interface ProjectDocsListProps {
  projectId: string;
  className?: string;
}

/**
 * Project documentation list
 * Shows all docs with create/edit/delete functionality and tag filtering
 */
export function ProjectDocsList({ projectId, className }: ProjectDocsListProps) {
  const [editingDoc, setEditingDoc] = useState<ProjectDoc | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showTagManagement, setShowTagManagement] = useState(false);

  const { data: docs = [], isLoading, isFetching } = useProjectDocs(projectId);
  const { data: tags = [], isLoading: tagsLoading } = useProjectTags(projectId);
  const deleteDoc = useDeleteDoc(projectId);

  // Client-side filtering by selected tags
  const filteredDocs = useMemo(() => {
    if (selectedTagIds.length === 0) return docs;
    // For now, show all docs - we'll need to fetch doc tags to filter properly
    // This is a placeholder - ideally we'd have tags included in docs query
    return docs;
  }, [docs, selectedTagIds]);

  const formatDate = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  const handleDelete = (docId: string, title: string) => {
    if (confirm(`Excluir documento "${title}"?`)) {
      deleteDoc.mutate(docId);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Documentação</h2>
            <p className="text-xs text-muted-foreground">Gerencie o conhecimento do projeto</p>
          </div>
          {isFetching && !isLoading && (
            <Loader2 className="size-4 animate-spin text-muted-foreground ml-2" />
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTagManagement(true)}
            title="Gerenciar tags"
          >
            <Settings className="size-4" />
          </Button>
          <Button
            onClick={() => setIsCreating(true)}
            size="sm"
            className="shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Plus className="size-4 mr-2" />
            Novo Documento
          </Button>
        </div>
      </div>

      {/* Tag Filter */}
      {!tagsLoading && tags.length > 0 && (
        <DocTagFilter
          tags={tags}
          selectedTagIds={selectedTagIds}
          onSelectionChange={setSelectedTagIds}
        />
      )}

      {/* Docs Grid */}
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
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum documento"
          description="Crie documentos para organizar o conhecimento do projeto."
          action={
            <Button onClick={() => setIsCreating(true)} size="default">
              Criar primeiro documento
            </Button>
          }
          className="border-dashed bg-muted/5 animate-in fade-in zoom-in-95 duration-500"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc: ProjectDoc, index: number) => (
            <Link
              key={doc.id}
              href={`/projects/${projectId}/docs/${doc.id}`}
              className="block group relative"
            >
              <Card
                className="h-full overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-muted/60 bg-card/50 hover:bg-card hover:border-primary/20 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Gradient glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <CardHeader className="pb-2 relative z-10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-base font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                        {doc.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-[10px] sm:text-xs">
                        <Clock className="size-3" />
                        {formatDate(doc.updatedAt)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 hover:bg-primary/10 hover:text-primary rounded-full relative z-20"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingDoc(doc);
                        }}
                        title="Editar"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 hover:bg-destructive/10 hover:text-destructive rounded-full relative z-20"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(doc.id, doc.title);
                        }}
                        title="Excluir"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-sm text-muted-foreground/80 line-clamp-3 leading-relaxed">
                    {doc.content
                      ? doc.content.replace(/#+\s/g, '').replace(/[\*_]/g, '') // Simple markdown strip
                      : 'Sem conteúdo'}
                  </p>
                  {/* Fade out text effect */}
                  <div className="absolute bottom-6 left-6 right-6 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

      )}

      {/* Create/Edit Modal */}
      <DocEditorModal
        open={isCreating || !!editingDoc}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setIsCreating(false);
            setEditingDoc(null);
          }
        }}
        projectId={projectId}
        doc={editingDoc}
      />

      {/* Tag Management Modal */}
      <TagManagementModal
        projectId={projectId}
        open={showTagManagement}
        onOpenChange={setShowTagManagement}
      />
    </div >
  );
}
