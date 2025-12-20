"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { AssigneeSelect } from "@/components/features/shared";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Feature {
  id: string;
  title: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  type: "TASK" | "BUG";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "BACKLOG" | "TODO" | "DOING" | "REVIEW" | "QA_READY" | "DONE";
  featureId: string;
  points?: string | null;
  module?: string | null;
  assigneeId?: string | null;
}

interface TaskFormData {
  title: string;
  description: string;
  type: "TASK" | "BUG";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "BACKLOG" | "TODO" | "DOING" | "REVIEW" | "QA_READY" | "DONE";
  featureId: string;
  points: string;
  module: string;
  assigneeId: string | null;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  features: Feature[];
  modules?: string[];
  defaultFeatureId?: string;
  taskToEdit?: Task | null;
  onSuccess?: () => void;
}

const INITIAL_FORM_DATA: TaskFormData = {
  title: "",
  description: "",
  type: "TASK",
  priority: "MEDIUM",
  status: "BACKLOG",
  featureId: "",
  points: "Sem estimativa",
  module: "Nenhum",
  assigneeId: null,
};

export function TaskDialog({
  open,
  onOpenChange,
  features,
  modules = [],
  defaultFeatureId,
  taskToEdit,
  onSuccess,
}: TaskDialogProps) {
  const [formData, setFormData] = useState<TaskFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);

  const isEditing = !!taskToEdit;

  // Reset or Fill form when dialog opens
  useEffect(() => {
    if (open) {
      if (taskToEdit) {
        setFormData({
          title: taskToEdit.title,
          description: taskToEdit.description || "",
          type: taskToEdit.type,
          priority: taskToEdit.priority,
          status: taskToEdit.status,
          featureId: taskToEdit.featureId,
          points: taskToEdit.points || "Sem estimativa",
          module: taskToEdit.module || "Nenhum",
          assigneeId: taskToEdit.assigneeId || null,
        });
      } else {
        setFormData({
          ...INITIAL_FORM_DATA,
          featureId: defaultFeatureId || features[0]?.id || "",
        });
      }
    }
  }, [open, taskToEdit, defaultFeatureId, features]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.featureId) {
      toast.error("Selecione uma feature");
      return;
    }

    setSaving(true);
    try {
      const url = isEditing ? `/api/tasks/${taskToEdit.id}` : "/api/tasks";
      const method = isEditing ? "PATCH" : "POST";

      const payload = {
        ...formData,
        // Converter valores "vazios" de volta para null/undefined se necessário pelo backend
        points: formData.points === "Sem estimativa" ? null : formData.points,
        module: formData.module === "Nenhum" ? null : formData.module,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(isEditing ? "Task atualizada!" : "Task criada com sucesso!");
        onOpenChange(false);
        onSuccess?.();
      } else {
        const error = await res.json();
        toast.error(error.error?.message || `Erro ao ${isEditing ? "atualizar" : "criar"} task`);
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error(`Erro ao ${isEditing ? "atualizar" : "criar"} task`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-modal max-h-[90vh] overflow-y-auto sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{isEditing ? "Editar Task" : "Nova Task"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Edite os detalhes da tarefa" : "Crie uma nova tarefa no backlog"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-sm font-medium">
              Título *
            </Label>
            <Input
              id="task-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Título da task"
              required
              className="text-base"
            />
          </div>

          {/* Feature Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Feature *</Label>
            <Select
              value={formData.featureId}
              onValueChange={(v) => setFormData({ ...formData, featureId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma feature" />
              </SelectTrigger>
              <SelectContent className="z-popover">
                {features.map((feature) => (
                  <SelectItem key={feature.id} value={feature.id}>
                    {feature.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description with Markdown */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Descrição (Markdown)</Label>
            <MarkdownEditor
              id="task-description"
              value={formData.description}
              onChange={(v) => setFormData({ ...formData, description: v })}
              placeholder="## Objetivo&#10;&#10;Descreva o objetivo da task...&#10;&#10;## Critérios de Aceite&#10;&#10;- [ ] Critério 1&#10;- [ ] Critério 2"
              minHeight="250px"
            />
          </div>

          {/* Grid for Types, Priority, Status */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as "TASK" | "BUG" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-popover">
                  <SelectItem value="TASK">Task</SelectItem>
                  <SelectItem value="BUG">Bug</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-popover">
                  <SelectItem value="LOW">Baixa</SelectItem>
                  <SelectItem value="MEDIUM">Média</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="CRITICAL">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-popover">
                  <SelectItem value="BACKLOG">Backlog</SelectItem>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="DOING">Doing</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Module and Points (Grid 2) */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Módulo</Label>
              <Select
                value={formData.module}
                onValueChange={(v) => setFormData({ ...formData, module: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um módulo" />
                </SelectTrigger>
                <SelectContent className="z-popover">
                  <SelectItem value="Nenhum">Nenhum</SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Story Points</Label>
              <Select
                value={formData.points}
                onValueChange={(v) => setFormData({ ...formData, points: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-popover">
                  <SelectItem value="Sem estimativa">Sem estimativa</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="13">13</SelectItem>
                  <SelectItem value="21">21</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Responsável</Label>
            <AssigneeSelect
              value={formData.assigneeId}
              onChange={(v) => setFormData({ ...formData, assigneeId: v })}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? "Salvando..." : "Criando..."}
                </>
              ) : (
                isEditing ? "Salvar Alterações" : "Criar Task"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Re-export as CreateTaskDialog for compatibility if needed, or just rename usages.
// I will verify usage in tasks/page.tsx
