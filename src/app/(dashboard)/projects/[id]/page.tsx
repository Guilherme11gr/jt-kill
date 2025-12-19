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
        setEpicFormData({ title: "", description: "" });
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
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
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
      <div className="mb-8">
        <Link href="/projects">
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="font-mono text-base">
                {project.key}
              </Badge>
              <h1 className="text-3xl font-bold">{project.name}</h1>
            </div>
            {project.description && (
              <p className="text-slate-400">{project.description}</p>
            )}
            {project.modules && project.modules.length > 0 && (
              <div className="flex gap-2 mt-3">
                {project.modules.map((module: string) => (
                  <Badge key={module} variant="secondary" className="bg-slate-800">
                    {module}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("epics")}
          className={`pb-3 px-2 font-medium transition-colors ${
            activeTab === "epics"
              ? "text-purple-400 border-b-2 border-purple-400"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          <Layers className="w-4 h-4 inline mr-2" />
          Epics ({epics.length})
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`pb-3 px-2 font-medium transition-colors ${
            activeTab === "tasks"
              ? "text-purple-400 border-b-2 border-purple-400"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          <CheckSquare className="w-4 h-4 inline mr-2" />
          Tasks ({tasks.length})
        </button>
      </div>

      {/* Epics Tab */}
      {activeTab === "epics" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Epics</h2>
            <Dialog open={isEpicDialogOpen} onOpenChange={setIsEpicDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Epic
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800">
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
                      className="bg-slate-800 border-slate-700"
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
                      className="bg-slate-800 border-slate-700"
                    />
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
            <Card className="bg-slate-900 border-slate-800 text-center p-12">
              <Layers className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma epic ainda</h3>
              <p className="text-slate-400 mb-4">
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
                <Card
                  key={epic.id}
                  className="bg-slate-900 border-slate-800 hover:border-purple-500 transition-colors"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{epic.title}</CardTitle>
                        {epic.description && (
                          <CardDescription className="mt-2">
                            {epic.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline">{epic.status}</Badge>
                        <span className="text-xs text-slate-500">
                          {epic._count?.features || 0} features
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
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
            <Card className="bg-slate-900 border-slate-800 text-center p-12">
              <CheckSquare className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma task ainda</h3>
              <p className="text-slate-400">
                Tasks aparecerão aqui quando forem criadas
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <Card
                  key={task.id}
                  className="bg-slate-900 border-slate-800 hover:border-purple-500 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {task.readableId}
                          </Badge>
                          <Badge
                            variant={task.type === "BUG" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {task.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {task.status}
                          </Badge>
                          {task.points && (
                            <Badge variant="secondary" className="text-xs">
                              {task.points}pts
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium mb-1">{task.title}</h4>
                        <p className="text-xs text-slate-500">
                          {task.feature.epic.title} → {task.feature.title}
                        </p>
                      </div>
                      <Badge
                        variant={
                          task.priority === "CRITICAL"
                            ? "destructive"
                            : task.priority === "HIGH"
                            ? "default"
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
