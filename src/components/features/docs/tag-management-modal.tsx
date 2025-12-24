'use client';

import { useState } from 'react';
import { Plus, Trash2, Tag, Loader2, AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocTagBadge } from './doc-tag-badge';
import { useProjectTags, useCreateTag, useDeleteTag, type DocTag } from '@/lib/query/hooks/use-doc-tags';

interface TagManagementModalProps {
    projectId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Modal for managing project tags (create, list, delete).
 */
export function TagManagementModal({
    projectId,
    open,
    onOpenChange,
}: TagManagementModalProps) {
    const [newTagName, setNewTagName] = useState('');
    const [tagToDelete, setTagToDelete] = useState<DocTag | null>(null);

    const { data: tags = [], isLoading } = useProjectTags(projectId);
    const createTag = useCreateTag(projectId);
    const deleteTag = useDeleteTag(projectId);

    const handleCreate = async () => {
        if (!newTagName.trim()) return;

        // Check for duplicate
        if (tags.some((t) => t.name.toLowerCase() === newTagName.trim().toLowerCase())) {
            return; // Toast will show from hook
        }

        await createTag.mutateAsync({ projectId, name: newTagName.trim() });
        setNewTagName('');
    };

    const handleDelete = async () => {
        if (!tagToDelete) return;
        await deleteTag.mutateAsync(tagToDelete.id);
        setTagToDelete(null);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Tag className="size-5" />
                            Gerenciar Tags
                        </DialogTitle>
                        <DialogDescription>
                            Crie e gerencie as tags do projeto para organizar a documentação.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        {/* Create New Tag */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nome da nova tag..."
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleCreate}
                                disabled={!newTagName.trim() || createTag.isPending}
                                size="sm"
                            >
                                {createTag.isPending ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Plus className="size-4" />
                                )}
                            </Button>
                        </div>

                        {/* Tags List */}
                        <div className="border rounded-lg p-3 min-h-[150px] max-h-[300px] overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : tags.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground text-sm">
                                    <Tag className="size-8 mb-2 opacity-30" />
                                    Nenhuma tag criada
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {tags.map((tag) => (
                                        <div
                                            key={tag.id}
                                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <DocTagBadge name={tag.name} />
                                                <span className="text-xs text-muted-foreground">
                                                    {tag._count?.assignments || 0} docs
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-7 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                                                onClick={() => setTagToDelete(tag)}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!tagToDelete} onOpenChange={() => setTagToDelete(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" />
                            Excluir Tag
                        </DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir a tag <strong>"{tagToDelete?.name}"</strong>?
                            <br />
                            <br />
                            <span className="text-destructive">
                                Isso removerá a tag de {tagToDelete?._count?.assignments || 0} documento(s).
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setTagToDelete(null)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteTag.isPending}
                        >
                            {deleteTag.isPending ? (
                                <Loader2 className="size-4 animate-spin mr-2" />
                            ) : (
                                <Trash2 className="size-4 mr-2" />
                            )}
                            Excluir
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
