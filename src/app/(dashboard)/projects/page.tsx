"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderKanban, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from "@/lib/query";
import { PageHeaderSkeleton, CardsSkeleton } from '@/components/layout/page-skeleton';

interface Project {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  modules?: string[];
  _count?: {
    epics: number;
    tasks: number;
  };
}

export default function ProjectsPage() {
  // React Query hooks
  const { data: projects = [], isLoading: loading } = useProjects();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Delete Project State
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    key: "",
    description: "",
    modules: "",
  });

  const resetForm = () => {
    setFormData({ name: "", key: "", description: "", modules: "" });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createProjectMutation.mutateAsync({
        name: formData.name,
        key: formData.key.toUpperCase(),
        description: formData.description || undefined,
        modules: formData.modules
          ? formData.modules.split(",").map((m) => m.trim()).filter(Boolean)
          : [],
      });
      resetForm();
      setIsCreateDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditClick = useCallback((project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      key: project.key,
      description: project.description || "",
      modules: project?.modules?.join(", ") ?? "",
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    try {
      await updateProjectMutation.mutateAsync({
        id: editingProject.id,
        data: {
          name: formData.name,
          description: formData.description || undefined,
          modules: formData.modules
            ? formData.modules.split(",").map((m) => m.trim()).filter(Boolean)
            : [],
        },
      });
      resetForm();
      setEditingProject(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteClick = useCallback((project: Project) => {
    setProjectToDelete(project);
  }, []);

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProjectMutation.mutateAsync(projectToDelete.id);
      setProjectToDelete(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditDialogClose = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditingProject(null);
      resetForm();
    }
  };

  // Derived state for saving indicator
  const saving = createProjectMutation.isPending || updateProjectMutation.isPending;

  // Only show skeleton on initial load (no cached data yet)
  // During refetch, keep UI mounted to preserve modal state
  if (loading && projects.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <CardsSkeleton count={6} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">Projetos</h1>
          <p className="text-muted-foreground">Gerencie seus projetos e tarefas</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Projeto</DialogTitle>
              <DialogDescription>
                Crie um projeto para organizar suas epics, features e tasks
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Projeto</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Meu Projeto Incrível"
                  required
                />
              </div>
              <div>
                <Label htmlFor="key">Chave (2-10 caracteres)</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                  placeholder="APP"
                  maxLength={10}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Usado para IDs legíveis (ex: APP-123)
                </p>
              </div>
              <div>
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do projeto..."
                />
              </div>
              <div>
                <Label htmlFor="modules">Módulos (separados por vírgula)</Label>
                <Input
                  id="modules"
                  value={formData.modules}
                  onChange={(e) => setFormData({ ...formData, modules: e.target.value })}
                  placeholder="backend, frontend, mobile"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
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
                    "Criar Projeto"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum projeto ainda"
          description="Comece criando seu primeiro projeto para organizar suas epics, features e tasks."
          action={
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Criar Primeiro Projeto
            </Button>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="relative group">
              <Link href={`/projects/${project.id}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline-info" className="font-mono">
                        {project.key}
                      </Badge>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{project._count?.epics || 0} epics</span>
                        <span>•</span>
                        <span>{project._count?.tasks || 0} tasks</span>
                      </div>
                    </div>
                    <CardTitle>{project.name}</CardTitle>
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  {project.modules && project.modules.length > 0 && (
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {project.modules.map((module) => (
                          <Badge
                            key={module}
                            variant="secondary"
                            className="text-xs"
                          >
                            {module}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  )}
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
                    <DropdownMenuItem onSelect={() => handleEditClick(project)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleDeleteClick(project)}
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
            <DialogDescription>
              Altere os dados do projeto. A chave não pode ser modificada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome do Projeto</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Meu Projeto Incrível"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-key">Chave</Label>
              <Input
                id="edit-key"
                value={formData.key}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A chave não pode ser alterada após a criação
              </p>
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição (opcional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do projeto..."
              />
            </div>
            <div>
              <Label htmlFor="edit-modules">Módulos (separados por vírgula)</Label>
              <Input
                id="edit-modules"
                value={formData.modules}
                onChange={(e) => setFormData({ ...formData, modules: e.target.value })}
                placeholder="backend, frontend, mobile"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleEditDialogClose(false)}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Você tem certeza?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o projeto
              <span className="font-medium text-foreground"> "{projectToDelete?.name}" </span>
              {((projectToDelete?._count?.epics || 0) > 0 || (projectToDelete?._count?.tasks || 0) > 0) && (
                <>
                  e todos os seus itens associados ({projectToDelete?._count?.epics || 0} epics, {projectToDelete?._count?.tasks || 0} tasks).
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setProjectToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteProject}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
