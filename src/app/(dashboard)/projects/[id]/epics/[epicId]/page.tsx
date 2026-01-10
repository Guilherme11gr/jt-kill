"use client";

import { useState, useCallback, use, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { ArrowLeft, Plus, Box, Loader2, MoreVertical, MoreHorizontal, Pencil, Trash2, Sparkles, Bug } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { TagSelector } from "@/components/features/tags";
import { DocContextSelector } from "@/components/features/shared";
import { useEpic, useFeaturesByEpic, useCreateFeature, useUpdateFeature, useDeleteFeature, useImproveFeatureDescription } from "@/lib/query";
import { PageHeaderSkeleton, CardsSkeleton } from '@/components/layout/page-skeleton';
import { toast } from "sonner";
import type { FeatureHealth } from "@/shared/types/project.types";
import type { TagInfo } from "@/shared/types/tag.types";
import {
  API_ROUTES,
  AI_REFINE_TIMEOUT_MS,
  AI_COOLDOWN_MS
} from "@/config/ai.config";

interface Feature {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  _count?: { tasks: number };
  tasks?: Array<{ status: string; type: string }>;
  // Health check fields
  health?: FeatureHealth;
  healthReason?: string | null;
  healthUpdatedAt?: string | Date | null;
}

import { EpicAISummaryCard } from "@/components/features/epics/epic-ai-summary-card";
import { EpicRiskBadge } from "@/components/features/epics";
import { FeatureHealthBadge } from "@/components/features/features";
import { StackedProgressBar } from "@/components/features/stacked-progress-bar";

export default function EpicDetailPage({
  params,
}: {
  params: Promise<{ id: string; epicId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  // React Query hooks
  const { data: epic, isLoading: epicLoading } = useEpic(resolvedParams.epicId);
  const { data: features = [], isLoading: featuresLoading } = useFeaturesByEpic(resolvedParams.epicId);

  // Mutations
  const createFeatureMutation = useCreateFeature();
  const updateFeatureMutation = useUpdateFeature();
  const deleteFeatureMutation = useDeleteFeature();
  const improveDescriptionMutation = useImproveFeatureDescription();

  const loading = epicLoading || featuresLoading;
  const saving = createFeatureMutation.isPending || updateFeatureMutation.isPending;
  const isGeneratingAI = improveDescriptionMutation.isPending;
  const [isRefiningDescription, setIsRefiningDescription] = useState(false);

  // Create Feature State
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);
  const [featureFormData, setFeatureFormData] = useState({
    title: "",
    description: "",
    status: "BACKLOG" as "BACKLOG" | "TODO" | "DOING" | "DONE",
    tags: [] as TagInfo[],
  });
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Edit Feature State
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [isFeatureEditDialogOpen, setIsFeatureEditDialogOpen] = useState(false);

  // Delete Feature State
  const [featureToDelete, setFeatureToDelete] = useState<Feature | null>(null);

  // AI Summary State

  // AI Refs for race condition prevention and cooldown
  const isImprovingRef = useRef(false);
  const isGeneratingRef = useRef(false);
  const lastAICallRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isImprovingRef.current = false;
      isGeneratingRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // AI handler for IMPROVING description (simple refinement)
  const handleImproveDescription = useCallback(async () => {
    // Prevent concurrent AI operations (fixes race condition)
    if (isImprovingRef.current || isGeneratingRef.current || isGeneratingAI) return;

    // Cooldown check (prevents spam)
    const now = Date.now();
    if (now - lastAICallRef.current < AI_COOLDOWN_MS) {
      toast.error('Aguarde alguns segundos antes de tentar novamente');
      return;
    }

    if (!featureFormData.description?.trim()) {
      toast.error('Adicione uma descrição primeiro');
      return;
    }

    isImprovingRef.current = true;
    lastAICallRef.current = now;
    setIsRefiningDescription(true);

    // Timeout controller to prevent hanging requests
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), AI_REFINE_TIMEOUT_MS);

    try {
      const response = await fetch(API_ROUTES.AI.REFINE_TEXT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: featureFormData.description,
          context: 'descrição de feature',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Erro ao refinar texto');
      }

      const result = await response.json();
      setFeatureFormData(prev => ({ ...prev, description: result.data.refinedText }));

      toast.success('Descrição melhorada', {
        description: `${result.data.originalLength} → ${result.data.refinedLength} caracteres`,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[AI] Improve error:', error);

      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Tempo esgotado', {
          description: 'A requisição demorou muito. Tente novamente.',
        });
      } else {
        toast.error('Erro ao melhorar', {
          description: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    } finally {
      isImprovingRef.current = false;
      abortControllerRef.current = null;
      setIsRefiningDescription(false);
    }
  }, [featureFormData.description, isGeneratingAI]);

  // AI handler for GENERATING description (intelligent with context)
  const handleGenerateDescription = useCallback(async () => {
    // Prevent concurrent AI operations (fixes race condition)
    if (isGeneratingRef.current || isImprovingRef.current || isGeneratingAI) return;

    // Cooldown check (prevents spam)
    const now = Date.now();
    if (now - lastAICallRef.current < AI_COOLDOWN_MS) {
      toast.error('Aguarde alguns segundos antes de tentar novamente');
      return;
    }

    if (!featureFormData.title.trim()) {
      toast.error('Preencha o título primeiro');
      return;
    }

    isGeneratingRef.current = true;
    lastAICallRef.current = now;

    try {
      const result = await improveDescriptionMutation.mutateAsync({
        title: featureFormData.title,
        description: featureFormData.description || undefined,
        epicId: resolvedParams.epicId,
        featureId: editingFeature?.id,
        docIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
      });
      setFeatureFormData(prev => ({ ...prev, description: result.description }));
      toast.success('Descrição gerada com sucesso!');
    } catch {
      // Error handled by hook
    } finally {
      isGeneratingRef.current = false;
    }
  }, [isGeneratingAI, featureFormData.title, featureFormData.description, resolvedParams.epicId, editingFeature?.id, improveDescriptionMutation]);

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFeatureMutation.mutateAsync({
        epicId: resolvedParams.epicId,
        title: featureFormData.title,
        description: featureFormData.description || undefined,
        status: featureFormData.status,
      });
      // TODO: Assign tags to feature after creation when API supports it
      setFeatureFormData({ title: "", description: "", status: "BACKLOG", tags: [] });
      setIsFeatureDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditFeatureClick = useCallback((feature: Feature) => {
    setEditingFeature(feature);
    setFeatureFormData({
      title: feature.title,
      description: feature.description || "",
      status: (feature.status as "BACKLOG" | "TODO" | "DOING" | "DONE") || "BACKLOG",
      tags: [], // Tags will be loaded separately if needed
    });
    setIsFeatureEditDialogOpen(true);
  }, []);

  const handleEditFeatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeature) return;

    try {
      await updateFeatureMutation.mutateAsync({
        id: editingFeature.id,
        data: {
          title: featureFormData.title,
          description: featureFormData.description || undefined,
          status: featureFormData.status,
        },
      });
      // TODO: Assign tags to feature when API supports it
      setIsFeatureEditDialogOpen(false);
      setEditingFeature(null);
      setFeatureFormData({ title: "", description: "", status: "BACKLOG", tags: [] });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteFeatureClick = useCallback((feature: Feature) => {
    setFeatureToDelete(feature); // Opens dialog
  }, []);

  const confirmDeleteFeature = async () => {
    if (!featureToDelete) return;

    try {
      await deleteFeatureMutation.mutateAsync(featureToDelete.id);
      setFeatureToDelete(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Only show skeleton on initial load (no cached data yet)
  // During refetch, keep UI mounted to preserve modal state
  if (loading && !epic && features.length === 0) {
    return (
      <div className="space-y-6">
        <div className="mb-6 md:mb-8">
          <PageHeaderSkeleton />
        </div>
        <CardsSkeleton count={3} />
      </div>
    );
  }

  if (!epic) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Epic não encontrada</h2>
        <p className="text-muted-foreground mb-4">Não foi possível carregar os dados da epic.</p>
        <Link href={`/projects/${resolvedParams.id}`}>
          <Button variant="outline">Voltar para o Projeto</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mx-auto mb-8">
        <Link
          href={`/projects/${resolvedParams.id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para Projeto
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline">
                EPIC
              </Badge>
              <Badge variant="secondary">
                {epic.status}
              </Badge>
              {epic.risk && (
                <EpicRiskBadge
                  risk={epic.risk}
                  riskReason={epic.riskReason}
                  riskUpdatedAt={epic.riskUpdatedAt}
                />
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {epic.title}
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {epic.description || "Sem descrição"}
            </p>
          </div>

          <div className="flex items-center gap-2">

            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <EpicAISummaryCard
          epicId={epic.id}
          initialSummary={epic.aiSummary}
          lastAnalyzedAt={epic.lastAnalyzedAt}
        />
      </div>

      {/* Features Section */}
      <div className="mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Box className="w-5 h-5 text-primary" />
            Features
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({features.length})
            </span>
          </h2>

          <Dialog open={isFeatureDialogOpen} onOpenChange={setIsFeatureDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Feature
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Feature</DialogTitle>
                <DialogDescription>
                  Features são entregáveis funcionais dentro da Epic
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateFeature} className="space-y-4">
                <div>
                  <Label htmlFor="feature-title">Título</Label>
                  <Input
                    id="feature-title"
                    value={featureFormData.title}
                    onChange={(e) =>
                      setFeatureFormData({ ...featureFormData, title: e.target.value })
                    }
                    placeholder="Ex: Autenticação via Google"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="feature-description">Descrição</Label>
                    <DocContextSelector
                      projectId={resolvedParams.id}
                      selectedDocIds={selectedDocIds}
                      onSelectionChange={setSelectedDocIds}
                      disabled={isGeneratingAI || isRefiningDescription}
                    />
                  </div>
                  <MarkdownEditor
                    id="feature-description"
                    value={featureFormData.description}
                    onChange={(v) =>
                      setFeatureFormData({ ...featureFormData, description: v })
                    }
                    placeholder="Detalhes técnicos da feature...&#10;&#10;## Critérios de Aceite&#10;- [ ] Critério 1"
                    minHeight="250px"
                    onImprove={handleImproveDescription}
                    onGenerate={handleGenerateDescription}
                    isImproving={isRefiningDescription}
                    isGenerating={isGeneratingAI}
                  />
                </div>
                <div>
                  <Label htmlFor="feature-status">Status</Label>
                  <Select
                    value={featureFormData.status}
                    onValueChange={(v) => setFeatureFormData({ ...featureFormData, status: v as "BACKLOG" | "TODO" | "DOING" | "DONE" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BACKLOG">Backlog</SelectItem>
                      <SelectItem value="TODO">A Fazer</SelectItem>
                      <SelectItem value="DOING">Em Progresso</SelectItem>
                      <SelectItem value="DONE">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Tags - Multi-select */}
                {resolvedParams.id && (
                  <div>
                    <Label>Tags</Label>
                    <TagSelector
                      projectId={resolvedParams.id}
                      selectedTags={featureFormData.tags}
                      onTagsChange={(tags) => setFeatureFormData({ ...featureFormData, tags })}
                      placeholder="Selecionar tags..."
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsFeatureDialogOpen(false)}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar Feature"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {features.length === 0 ? (
          <EmptyState
            icon={Box}
            title="Nenhuma feature ainda"
            description="Quebre sua Epic em features menores e entregáveis para facilitar o desenvolvimento."
            action={
              <Button
                variant="outline"
                onClick={() => setIsFeatureDialogOpen(true)}
              >
                Criar Primeira Feature
              </Button>
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <div key={feature.id} className="relative group">
                <Link href={`/projects/${resolvedParams.id}/epics/${resolvedParams.epicId}/features/${feature.id}`}>
                  <Card
                    className="group hover:bg-muted/50 hover:border-primary/50 transition-colors cursor-pointer h-full"
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-[10px]">
                          FEATURE
                        </Badge>
                        <Badge
                          variant="secondary"
                        >
                          {feature.status}
                        </Badge>
                        {feature.health && (
                          <FeatureHealthBadge
                            health={feature.health}
                            healthReason={feature.healthReason}
                            healthUpdatedAt={feature.healthUpdatedAt}
                          />
                        )}
                      </div>
                      <CardTitle className="text-lg pr-8">
                        {feature.title}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1.5 font-medium">
                        <span className="flex items-center gap-1">
                          <span className="text-emerald-500">✅</span>
                          {feature.tasks?.filter(t => t.status === 'DONE').length || 0} Done
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-blue-500">🔵</span>
                          {feature.tasks?.filter(t => t.status === 'DOING').length || 0} Doing
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-zinc-500">⚪</span>
                          {feature.tasks?.filter(t => !['DONE', 'DOING'].includes(t.status)).length || 0} Todo
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-3 mt-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                              <span className="font-medium">{feature._count?.tasks || 0} tasks</span>
                            </div>
                          </div>
                          {(feature.tasks?.filter(t => t.type === 'BUG' && t.status !== 'DONE').length || 0) > 0 && (
                            <div className="flex items-center gap-1.5 text-red-500/90 font-medium bg-red-500/10 px-2 py-0.5 rounded-full text-[10px]" title="Bugs abertos">
                              <Bug className="w-3 h-3" />
                              {feature.tasks?.filter(t => t.type === 'BUG' && t.status !== 'DONE').length}
                            </div>
                          )}
                        </div>
                        <StackedProgressBar tasks={feature.tasks || []} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                {/* Action Menu */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => handleEditFeatureClick(feature)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => handleDeleteFeatureClick(feature)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Feature Dialog */}
      <Dialog open={isFeatureEditDialogOpen} onOpenChange={setIsFeatureEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Feature</DialogTitle>
            <DialogDescription>
              Edite os detalhes da feature
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditFeatureSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-feature-title">Título</Label>
              <Input
                id="edit-feature-title"
                value={featureFormData.title}
                onChange={(e) =>
                  setFeatureFormData({ ...featureFormData, title: e.target.value })
                }
                placeholder="Ex: Autenticação via Google"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="edit-feature-description">Descrição</Label>
                <DocContextSelector
                  projectId={resolvedParams.id}
                  selectedDocIds={selectedDocIds}
                  onSelectionChange={setSelectedDocIds}
                  disabled={isGeneratingAI || isRefiningDescription}
                />
              </div>
              <MarkdownEditor
                id="edit-feature-description"
                value={featureFormData.description}
                onChange={(v) =>
                  setFeatureFormData({ ...featureFormData, description: v })
                }
                placeholder="Detalhes técnicos da feature...&#10;&#10;## Critérios de Aceite&#10;- [ ] Critério 1"
                minHeight="250px"
                onImprove={handleImproveDescription}
                onGenerate={handleGenerateDescription}
                isImproving={isRefiningDescription}
                isGenerating={isGeneratingAI}
              />
            </div>
            <div>
              <Label htmlFor="edit-feature-status">Status</Label>
              <Select
                value={featureFormData.status}
                onValueChange={(v) => setFeatureFormData({ ...featureFormData, status: v as "BACKLOG" | "TODO" | "DOING" | "DONE" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BACKLOG">Backlog</SelectItem>
                  <SelectItem value="TODO">A Fazer</SelectItem>
                  <SelectItem value="DOING">Em Progresso</SelectItem>
                  <SelectItem value="DONE">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Tags - Multi-select */}
            {resolvedParams.id && (
              <div>
                <Label>Tags</Label>
                <TagSelector
                  projectId={resolvedParams.id}
                  selectedTags={featureFormData.tags}
                  onTagsChange={(tags) => setFeatureFormData({ ...featureFormData, tags })}
                  placeholder="Selecionar tags..."
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsFeatureEditDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Feature Confirmation Dialog */}
      <Dialog open={!!featureToDelete} onOpenChange={(open) => !open && setFeatureToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Você tem certeza?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a feature
              <span className="font-medium text-foreground"> "{featureToDelete?.title}" </span>
              {(featureToDelete?._count?.tasks || 0) > 0 && (
                <>
                  e suas <span className="font-medium text-foreground">{featureToDelete?._count?.tasks} tasks</span>
                </>
              )}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setFeatureToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteFeature}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
