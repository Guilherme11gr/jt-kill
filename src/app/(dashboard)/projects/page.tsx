"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderKanban, Loader2 } from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  modules: string[];
  _count?: {
    epics: number;
    tasks: number;
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    key: "",
    description: "",
    modules: "",
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const response = await res.json();
        setProjects(response.data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar projetos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          key: formData.key.toUpperCase(),
          description: formData.description || null,
          modules: formData.modules
            ? formData.modules.split(",").map((m) => m.trim()).filter(Boolean)
            : [],
        }),
      });

      if (res.ok) {
        setFormData({ name: "", key: "", description: "", modules: "" });
        setIsDialogOpen(false);
        fetchProjects();
      } else {
        const error = await res.json();
        alert(error.error?.message || "Erro ao criar projeto");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao criar projeto");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  onClick={() => setIsDialogOpen(false)}
                  disabled={creating}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
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
        <Card className="text-center p-12">
          <FolderKanban className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Nenhum projeto ainda</h3>
          <p className="text-muted-foreground mb-4">
            Comece criando seu primeiro projeto
          </p>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Criar Primeiro Projeto
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
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
          ))}
        </div>
      )}
    </div>
  );
}
