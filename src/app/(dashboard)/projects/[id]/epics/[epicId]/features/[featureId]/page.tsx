"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Loader2, CheckSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  priority: string;
  points: number | null;
  readableId: string;
}

interface Feature {
  id: string;
  title: string;
  description: string | null;
  status: string;
  epic: {
    id: string;
    title: string;
    project: {
      id: string;
      name: string;
      key: string;
    };
  };
}

const TASK_STATUSES = ["BACKLOG", "TODO", "DOING", "REVIEW", "QA_READY", "DONE"] as const;
type TaskStatus = typeof TASK_STATUSES[number];

const STATUS_COLORS: Record<TaskStatus, string> = {
  BACKLOG: "bg-muted text-muted-foreground",
  TODO: "bg-blue-500/20 text-blue-400",
  DOING: "bg-yellow-500/20 text-yellow-400",
  REVIEW: "bg-purple-500/20 text-purple-400",
  QA_READY: "bg-cyan-500/20 text-cyan-400",
  DONE: "bg-green-500/20 text-green-400",
};

export default function FeatureDetailPage({
  params,
}: {
  params: Promise<{ id: string; epicId: string; featureId: string }>;
}) {
  const resolvedParams = use(params);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create Task State
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: "",
    description: "",
    type: "TASK" as "TASK" | "BUG",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    status: "BACKLOG" as TaskStatus,
  });

  // Edit Task State
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskEditDialogOpen, setIsTaskEditDialogOpen] = useState(false);

  // Delete Task State
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  useEffect(() => {
    fetchFeatureData();
  }, [resolvedParams.featureId]);

  const fetchFeatureData = async () => {
    try {
      const [featureRes, tasksRes] = await Promise.all([
        fetch(`/api/features/${resolvedParams.featureId}`),
        fetch(`/api/tasks?featureId=${resolvedParams.featureId}&pageSize=100`),
      ]);

      if (featureRes.ok) {
        const data = await featureRes.json();
        setFeature(data.data);
      }
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.data?.items || []);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados da feature");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskFormData,
          featureId: resolvedParams.featureId,
        }),
      });

      if (res.ok) {
        setTaskFormData({ title: "", description: "", type: "TASK", priority: "MEDIUM", status: "BACKLOG" });
        setIsTaskDialogOpen(false);
        fetchFeatureData();
        toast.success("Task criada com sucesso!");
      } else {
        const error = await res.json();
        toast.error(error.error?.message || "Erro ao criar task");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao criar task");
    } finally {
      setSaving(false);
    }
  };

  const handleEditTaskClick = useCallback((task: Task, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingTask(task);
    setTaskFormData({
      title: task.title,
      description: task.description || "",
      type: task.type as "TASK" | "BUG",
      priority: task.priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      status: task.status as TaskStatus,
    });
    setIsTaskEditDialogOpen(true);
  }, []);

  const handleEditTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskFormData),
      });

      if (res.ok) {
        setIsTaskEditDialogOpen(false);
        setEditingTask(null);
        setTaskFormData({ title: "", description: "", type: "TASK", priority: "MEDIUM", status: "BACKLOG" });
        fetchFeatureData();
        toast.success("Task atualizada com sucesso!");
      } else {
        toast.error("Erro ao atualizar task");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao atualizar task");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTaskClick = useCallback((task: Task, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTaskToDelete(task);
  }, []);

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      const res = await fetch(`/api/tasks/${taskToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchFeatureData();
        setTaskToDelete(null);
        toast.success("Task excluída com sucesso!");
      } else {
        toast.error("Erro ao excluir task");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao excluir task");
    }
  };

  // Group tasks by status
  const tasksByStatus = TASK_STATUSES.reduce((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Feature não encontrada</h2>
        <p className="text-muted-foreground mb-4">Não foi possível carregar os dados da feature.</p>
        <Link href={`/projects/${resolvedParams.id}`}>
          <Button variant="outline">Voltar para o Projeto</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/projects/${resolvedParams.id}/epics/${resolvedParams.epicId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para {feature.epic.title}
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <span>{feature.epic.project.key}</span>
              <span>→</span>
              <span>{feature.epic.title}</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline">FEATURE</Badge>
              <Badge variant="secondary">{feature.status}</Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              {feature.title}
            </h1>
            {feature.description && (
              <p className="text-muted-foreground max-w-2xl">
                {feature.description}
              </p>
            )}
          </div>

          <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Task</DialogTitle>
                <DialogDescription>
                  Adicione uma task nesta feature
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <Label htmlFor="task-title">Título</Label>
                  <Input
                    id="task-title"
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                    placeholder="Nome da Task"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="task-description">Descrição</Label>
                  <Textarea
                    id="task-description"
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                    placeholder="Detalhes da task..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={taskFormData.type}
                      onValueChange={(v) => setTaskFormData({ ...taskFormData, type: v as "TASK" | "BUG" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TASK">Task</SelectItem>
                        <SelectItem value="BUG">Bug</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select
                      value={taskFormData.priority}
                      onValueChange={(v) => setTaskFormData({ ...taskFormData, priority: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Baixa</SelectItem>
                        <SelectItem value="MEDIUM">Média</SelectItem>
                        <SelectItem value="HIGH">Alta</SelectItem>
                        <SelectItem value="CRITICAL">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : "Criar Task"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tasks Kanban */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-primary" />
          Tasks
          <span className="text-sm font-normal text-muted-foreground">({tasks.length})</span>
        </h2>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nenhuma task ainda"
          description="Crie tasks para detalhar o trabalho necessário nesta feature."
          action={
            <Button onClick={() => setIsTaskDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Criar Primeira Task
            </Button>
          }
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {TASK_STATUSES.map((status) => (
            <div key={status} className="flex-shrink-0 w-72">
              <div className="mb-3 flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[status]}`}>
                  {status.replace("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {tasksByStatus[status].length}
                </span>
              </div>
              <div className="space-y-3 min-h-[200px] p-2 rounded-lg bg-muted/20 border border-dashed border-muted">
                {tasksByStatus[status].map((task) => (
                  <Card key={task.id} className="group hover:border-primary/50 transition-colors">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {task.readableId}
                            </Badge>
                            <Badge variant={task.type === "BUG" ? "destructive" : "secondary"} className="text-[10px]">
                              {task.type}
                            </Badge>
                          </div>
                          <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleEditTaskClick(task, e)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleDeleteTaskClick(task, e)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            task.priority === "CRITICAL" ? "destructive" :
                              task.priority === "HIGH" ? "outline-warning" : "outline"
                          }
                          className="text-[10px]"
                        >
                          {task.priority}
                        </Badge>
                        {task.points && (
                          <Badge variant="secondary" className="text-[10px]">
                            {task.points}pts
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={isTaskEditDialogOpen} onOpenChange={setIsTaskEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Task</DialogTitle>
            <DialogDescription>Edite os detalhes da task</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditTaskSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-task-title">Título</Label>
              <Input
                id="edit-task-title"
                value={taskFormData.title}
                onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-task-description">Descrição</Label>
              <Textarea
                id="edit-task-description"
                value={taskFormData.description}
                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={taskFormData.type}
                  onValueChange={(v) => setTaskFormData({ ...taskFormData, type: v as "TASK" | "BUG" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TASK">Task</SelectItem>
                    <SelectItem value="BUG">Bug</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={taskFormData.priority}
                  onValueChange={(v) => setTaskFormData({ ...taskFormData, priority: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Baixa</SelectItem>
                    <SelectItem value="MEDIUM">Média</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="CRITICAL">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={taskFormData.status}
                onValueChange={(v) => setTaskFormData({ ...taskFormData, status: v as TaskStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsTaskEditDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation Dialog */}
      <Dialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Task?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A task <strong>"{taskToDelete?.title}"</strong> será permanentemente excluída.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setTaskToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteTask}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
