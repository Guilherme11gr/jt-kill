"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, ArrowLeft, Layers, Boxes, CheckSquare } from "lucide-react";
import Link from "next/link";
import { use } from "react";

interface Epic {
  id: string;
  title: string;
  description: string | null;
  status: string;
  _count?: { features: number };
}

interface Feature {
  id: string;
  title: string;
  description: string | null;
  status: string;
  epicId: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  points: number | null;
  readableId: string;
  feature: {
    title: string;
    epic: {
      title: string;
    };
  };
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [project, setProject] = useState<any>(null);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"epics" | "tasks">("epics");
  const [isEpicDialogOpen, setIsEpicDialogOpen] = useState(false);
  const [epicFormData, setEpicFormData] = useState({
    title: "",
    description: "",
    status: "OPEN" as "OPEN" | "CLOSED",
  });

  useEffect(() => {
    fetchProjectData();
  }, [resolvedParams.id]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, epicsRes, tasksRes] = await Promise.all([
        fetch(`/api/projects/${resolvedParams.id}`),
        fetch(`/api/projects/${resolvedParams.id}/epics`),
        fetch(`/api/tasks?projectId=${resolvedParams.id}`),
      ]);

      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData.data || projectData);
      }
      if (epicsRes.ok) {
        const epicsData = await epicsRes.json();
        setEpics(epicsData.data || []);
      }
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.data?.items || data.items || []);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEpic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}/epics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(epicFormData),
      });

      if (res.ok) {
        setEpicFormData({ title: "", description: "", status: "OPEN" });
        setIsEpicDialogOpen(false);
        fetchProjectData();
      } else {
        const error = await res.json();
        alert(error.error?.message || "Erro ao criar epic");
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Projeto não encontrado</h2>
        <Link href="/projects">
          <Button variant="outline">Voltar para Projetos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <Link href="/projects">
          <Button variant="ghost" className="gap-2 mb-4 pl-0 hover:pl-2 transition-all">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-sm md:text-base">
                {project.key}
              </Badge>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{project.name}</h1>
            </div>
            {project.description && (
              <p className="text-muted-foreground text-sm md:text-base">{project.description}</p>
            )}
            {project.modules && project.modules.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {project.modules.map((module: string) => (
                  <Badge key={module} variant="secondary" className="bg-muted">
                    {module}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab("epics")}
          className={`pb-3 px-2 font-medium transition-colors whitespace-nowrap ${activeTab === "epics"
            ? "text-primary border-b-2 border-primary"
            : "text-muted-foreground hover:text-foreground"
            }`}
        >
          <Layers className="w-4 h-4 inline mr-2" />
          Epics ({epics.length})
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`pb-3 px-2 font-medium transition-colors whitespace-nowrap ${activeTab === "tasks"
            ? "text-primary border-b-2 border-primary"
            : "text-muted-foreground hover:text-foreground"
            }`}
        >
          <CheckSquare className="w-4 h-4 inline mr-2" />
          Tasks ({tasks.length})
        </button>
      </div>

      {/* Epics Tab */}
      {activeTab === "epics" && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold">Epics</h2>
            <Dialog open={isEpicDialogOpen} onOpenChange={setIsEpicDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="w-4 h-4" />
                  Nova Epic
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Epic</DialogTitle>
                  <DialogDescription>
                    Epics agrupam features relacionadas
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateEpic} className="space-y-4">
                  <div>
                    <Label htmlFor="epic-title">Título</Label>
                    <Input
                      id="epic-title"
                      value={epicFormData.title}
                      onChange={(e) =>
                        setEpicFormData({ ...epicFormData, title: e.target.value })
                      }
                      placeholder="Nome da Epic"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="epic-description">Descrição</Label>
                    <Textarea
                      id="epic-description"
                      value={epicFormData.description}
                      onChange={(e) =>
                        setEpicFormData({ ...epicFormData, description: e.target.value })
                      }
                      placeholder="Descrição da epic..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="epic-status">Status</Label>
                    <Select
                      value={epicFormData.status}
                      onValueChange={(v) => setEpicFormData({ ...epicFormData, status: v as "OPEN" | "CLOSED" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Aberto</SelectItem>
                        <SelectItem value="CLOSED">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEpicDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">Criar Epic</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {epics.length === 0 ? (
            <Card className="text-center p-12">
              <Layers className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma epic ainda</h3>
              <p className="text-muted-foreground mb-4">
                Crie epics para organizar suas features
              </p>
              <Button onClick={() => setIsEpicDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Criar Primeira Epic
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {epics.map((epic) => (
                <Link key={epic.id} href={`/projects/${resolvedParams.id}/epics/${epic.id}`}>
                  <Card
                    className="hover:border-primary/50 hover:shadow-sm transition-all duration-300 cursor-pointer group"
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-card-foreground group-hover:text-foreground transition-colors">
                            {epic.title}
                          </CardTitle>
                          {epic.description && (
                            <CardDescription className="mt-2 text-muted-foreground group-hover:text-muted-foreground/80">
                              {epic.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge
                            variant={
                              epic.status === "DONE" ? "outline-success" :
                                epic.status === "IN_PROGRESS" ? "outline-info" :
                                  "outline"
                            }
                            className="transition-colors"
                          >
                            {epic.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">
                            {epic._count?.features || 0} features
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div>
          <h2 className="text-xl font-semibold mb-6">Tasks</h2>
          {tasks.length === 0 ? (
            <Card className="text-center p-12">
              <CheckSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma task ainda</h3>
              <p className="text-muted-foreground">
                Tasks aparecerão aqui quando forem criadas
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <Card
                  key={task.id}
                  className="hover:border-primary transition-colors"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {task.readableId}
                          </Badge>
                          <Badge
                            variant={task.type === "BUG" ? "destructive" : "outline-info"}
                            className="text-xs"
                          >
                            {task.type}
                          </Badge>
                          <Badge
                            variant={
                              task.status === "DONE" ? "outline-success" :
                                task.status === "DOING" ? "outline-info" :
                                  task.status === "REVIEW" ? "outline-purple" :
                                    "outline"
                            }
                            className="text-xs"
                          >
                            {task.status}
                          </Badge>
                          {task.points && (
                            <Badge variant="secondary" className="text-xs">
                              {task.points}pts
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium mb-1">{task.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {task.feature.epic.title} → {task.feature.title}
                        </p>
                      </div>
                      <Badge
                        variant={
                          task.priority === "CRITICAL"
                            ? "destructive"
                            : task.priority === "HIGH"
                              ? "outline-warning"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
