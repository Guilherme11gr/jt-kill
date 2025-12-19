"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Feature {
  id: string;
  title: string;
}

interface TaskFormData {
  title: string;
  description: string;
  type: "TASK" | "BUG";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "BACKLOG" | "TODO" | "DOING" | "REVIEW" | "QA_READY" | "DONE";
  featureId: string;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  features: Feature[];
  defaultFeatureId?: string;
  onSuccess?: () => void;
}

const INITIAL_FORM_DATA: TaskFormData = {
  title: "",
  description: "",
  type: "TASK",
  priority: "MEDIUM",
  status: "BACKLOG",
  featureId: "",
};

export function CreateTaskDialog({
  open,
  onOpenChange,
  features,
  defaultFeatureId,
  onSuccess,
}: CreateTaskDialogProps) {
  const [formData, setFormData] = useState<TaskFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        ...INITIAL_FORM_DATA,
        featureId: defaultFeatureId || features[0]?.id || "",
      });
    }
  }, [open, defaultFeatureId, features]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.featureId) {
      toast.error("Selecione uma feature");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Task criada com sucesso!");
        onOpenChange(false);
        onSuccess?.();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Nova Task</DialogTitle>
          <DialogDescription>
            Crie uma nova task com descrição em Markdown
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
              <SelectContent>
                {features.map((feature) => (
                  <SelectItem key={feature.id} value={feature.id}>
                    {feature.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type and Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as "TASK" | "BUG" })}
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

            <div className="space-y-2">
              <Label className="text-sm font-medium">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v as any })}
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
                  Criando...
                </>
              ) : (
                "Criar Task"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
