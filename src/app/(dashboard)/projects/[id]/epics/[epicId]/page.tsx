"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Box, Loader2, MoreVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

interface Feature {
  id: string;
  title: string;
  description: string | null;
  status: string;
  _count?: { tasks: number };
}

interface Epic {
  id: string;
  title: string;
  description: string | null;
  status: string;
  epicId: string;
}

export default function EpicDetailPage({
  params,
}: {
  params: Promise<{ id: string; epicId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [epic, setEpic] = useState<Epic | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create Feature State
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);
  const [featureFormData, setFeatureFormData] = useState({
    title: "",
    description: "",
    status: "BACKLOG" as "BACKLOG" | "TODO" | "DOING" | "DONE",
  });

  // Edit Feature State
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [isFeatureEditDialogOpen, setIsFeatureEditDialogOpen] = useState(false);

  // Delete Feature State
  const [featureToDelete, setFeatureToDelete] = useState<Feature | null>(null);

  useEffect(() => {
    fetchEpicData();
  }, [resolvedParams.epicId]);

  const fetchEpicData = async () => {
    try {
      const [epicRes, featuresRes] = await Promise.all([
        fetch(`/api/epics/${resolvedParams.epicId}`),
        fetch(`/api/epics/${resolvedParams.epicId}/features`),
      ]);

      if (epicRes.ok) {
        const data = await epicRes.json();
        setEpic(data.data);
      }
      if (featuresRes.ok) {
        const data = await featuresRes.json();
        setFeatures(data.data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados da epic");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/epics/${resolvedParams.epicId}/features`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(featureFormData),
      });

      if (res.ok) {
        setFeatureFormData({ title: "", description: "", status: "BACKLOG" });
        setIsFeatureDialogOpen(false);
        fetchEpicData();
        toast.success("Feature criada com sucesso!");
      } else {
        toast.error("Erro ao criar feature");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao criar feature");
    } finally {
      setSaving(false);
    }
  };

  const handleEditFeatureClick = useCallback((feature: Feature, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingFeature(feature);
    setFeatureFormData({
      title: feature.title,
      description: feature.description || "",
      status: (feature.status as "BACKLOG" | "TODO" | "DOING" | "DONE") || "BACKLOG",
    });
    setIsFeatureEditDialogOpen(true);
  }, []);

  const handleEditFeatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeature) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/features/${editingFeature.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(featureFormData),
      });

      if (res.ok) {
        setIsFeatureEditDialogOpen(false);
        setEditingFeature(null);
        setFeatureFormData({ title: "", description: "", status: "BACKLOG" });
        fetchEpicData();
        toast.success("Feature atualizada com sucesso!");
      } else {
        toast.error("Erro ao atualizar feature");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao atualizar feature");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFeatureClick = useCallback((feature: Feature, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFeatureToDelete(feature); // Opens dialog
  }, []);

  const confirmDeleteFeature = async () => {
    if (!featureToDelete) return;

    try {
      const res = await fetch(`/api/features/${featureToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchEpicData();
        setFeatureToDelete(null);
        toast.success("Feature excluída com sucesso!");
      } else {
        toast.error("Erro ao excluir feature");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao excluir feature");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
      <div className="max-w-6xl mx-auto mb-8">
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
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {epic.title}
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {epic.description || "Sem descrição"}
            </p>
          </div>

          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto">
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
                  <Label htmlFor="feature-description">Descrição</Label>
                  <Textarea
                    id="feature-description"
                    value={featureFormData.description}
                    onChange={(e) =>
                      setFeatureFormData({ ...featureFormData, description: e.target.value })
                    }
                    placeholder="Detalhes técnicos da feature..."
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
                <Card
                  className="group hover:bg-muted/50 transition-colors cursor-pointer h-full"
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
                    </div>
                    <CardTitle className="text-lg pr-8">
                      {feature.title}
                    </CardTitle>
                    {feature.description && (
                      <CardDescription className="line-clamp-2">
                        {feature.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        {feature._count?.tasks || 0} tasks
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Action Menu */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleEditFeatureClick(feature, e)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteFeatureClick(feature, e)}
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
              <Label htmlFor="edit-feature-description">Descrição</Label>
              <Textarea
                id="edit-feature-description"
                value={featureFormData.description}
                onChange={(e) =>
                  setFeatureFormData({ ...featureFormData, description: e.target.value })
                }
                placeholder="Detalhes técnicos da feature..."
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
