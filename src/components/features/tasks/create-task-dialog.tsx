"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { AssigneeSelect } from "@/components/features/shared";
import { TagSelector } from "@/components/features/tags";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ModuleTagInput } from "@/components/ui/module-tag-input";
import { AIImproveButton } from "@/components/ui/ai-improve-button";
import { useProjects, useCreateTask, useUpdateTask, useGenerateDescription, useImproveDescription } from "@/lib/query";
import { useAssignTaskTags } from "@/lib/query/hooks/use-task-tags";
import { TaskStatus } from "@/shared/types";
import type { TagInfo } from "@/shared/types/tag.types";

interface Feature {
  id: string;
  title: string;
  epic?: {
    project?: {
      id: string;
      modules?: string[];
    };
  };
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
  modules?: string[];
  assigneeId?: string | null;
  tags?: TagInfo[];
}

interface TaskFormData {
  title: string;
  description: string;
  type: "TASK" | "BUG";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "BACKLOG" | "TODO" | "DOING" | "REVIEW" | "QA_READY" | "DONE";
  featureId: string;
  points: string;
  modules: string[];
  tags: TagInfo[];
  assigneeId: string | null;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  features: Feature[];
  modules?: string[]; // Optional fallback modules (deprecated, prefer deriving from feature)
  defaultFeatureId?: string;
  defaultValues?: {
    status?: string;
    priority?: string;
    modules?: string[];
    featureId?: string;
  };
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
  modules: [],
  tags: [],
  assigneeId: null,
};

export function TaskDialog({
  open,
  onOpenChange,
  projectId,
  features,
  modules: fallbackModules = [],
  defaultFeatureId,
  defaultValues,
  taskToEdit,
  onSuccess,
}: TaskDialogProps) {
  const [formData, setFormData] = useState<TaskFormData>(INITIAL_FORM_DATA);
  const [includeProjectDocs, setIncludeProjectDocs] = useState(false);
  // Remove local saving state, use mutation state instead
  const { data: projects } = useProjects();

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const assignTagsMutation = useAssignTaskTags();
  const generateDescription = useGenerateDescription();
  const improveDescription = useImproveDescription();

  const isSaving = createTaskMutation.isPending || updateTaskMutation.isPending || assignTagsMutation.isPending;
  const isGeneratingAI = generateDescription.isPending || improveDescription.isPending;

  const isEditing = !!taskToEdit;

  // Filter features by projectId (if provided)
  const filteredFeatures = useMemo(() => {
    if (!projectId) return features; // No filter: show all
    return features.filter(f => f.epic?.project?.id === projectId);
  }, [features, projectId]);

  // Derive the project ID from the selected feature
  const selectedFeature = useMemo(() =>
    features.find(f => f.id === formData.featureId),
    [features, formData.featureId]
  );

  const resolvedProjectId = projectId || selectedFeature?.epic?.project?.id;

  // Get modules for the current project (filter by project)
  const availableModules = useMemo(() => {
    if (!resolvedProjectId || !projects) return fallbackModules;
    const project = projects.find(p => p.id === resolvedProjectId);
    return project?.modules || fallbackModules;
  }, [resolvedProjectId, projects, fallbackModules]);

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
          modules: taskToEdit.modules || [],
          tags: taskToEdit.tags || [],
          assigneeId: taskToEdit.assigneeId || null,
        });
      } else {
        // Merge defaults
        setFormData({
          ...INITIAL_FORM_DATA,
          status: (defaultValues?.status as any) || INITIAL_FORM_DATA.status,
          priority: (defaultValues?.priority as any) || INITIAL_FORM_DATA.priority,
          modules: defaultValues?.modules || INITIAL_FORM_DATA.modules,
          tags: [],
          featureId: defaultValues?.featureId || defaultFeatureId || filteredFeatures[0]?.id || "",
        });
      }
    }
  }, [open, taskToEdit, defaultFeatureId, filteredFeatures, defaultValues]);

  // Memoized AI handler to prevent recreation on each render
  const handleAIGenerate = useCallback(async () => {
    // Guard against double-clicks
    if (isGeneratingAI) return;

    if (!formData.featureId || !formData.title.trim()) {
      toast.error('Preencha o título e selecione uma feature primeiro');
      return;
    }

    try {
      // Para edição de task existente, usar improve (tem mais contexto)
      if (isEditing && taskToEdit?.id) {
        const result = await improveDescription.mutateAsync({
          taskId: taskToEdit.id,
          includeProjectDocs,
        });
        setFormData(prev => ({ ...prev, description: result.description }));
        toast.success('Descrição melhorada com sucesso!');
      } else {
        // Para nova task, usar generate com contexto inline
        const result = await generateDescription.mutateAsync({
          title: formData.title,
          featureId: formData.featureId,
          currentDescription: formData.description || undefined,
          type: formData.type,
          priority: formData.priority,
          includeProjectDocs,
          projectId: resolvedProjectId || undefined,
        });
        setFormData(prev => ({ ...prev, description: result.description }));
        toast.success('Descrição gerada com sucesso!');
      }
    } catch {
      // Error toast is handled by hook
    }
  }, [
    isGeneratingAI,
    formData.featureId,
    formData.title,
    formData.description,
    formData.type,
    formData.priority,
    isEditing,
    taskToEdit?.id,
    includeProjectDocs,
    resolvedProjectId,
    improveDescription,
    generateDescription,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.featureId) {
      toast.error("Selecione uma feature");
      return;
    }

    // Validate project can be determined for new tasks
    if (!isEditing && !resolvedProjectId) {
      toast.error("Não foi possível determinar o projeto. Selecione uma feature válida.");
      return;
    }

    try {
      if (isEditing && taskToEdit) {
        await updateTaskMutation.mutateAsync({
          id: taskToEdit.id,
          data: {
            title: formData.title,
            description: formData.description,
            type: formData.type as any, // Type cast or fix interface properly
            priority: formData.priority,
            status: formData.status as TaskStatus,
            featureId: formData.featureId,
            points: formData.points === "Sem estimativa" ? null : Number(formData.points),
            modules: formData.modules,
            assigneeId: formData.assigneeId
          }
        });
        // Assign tags after update
        if (formData.tags.length > 0) {
          await assignTagsMutation.mutateAsync({
            taskId: taskToEdit.id,
            tagIds: formData.tags.map(t => t.id),
          });
        }
        // Success toast handled by hook
      } else {
        const newTask = await createTaskMutation.mutateAsync({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
          status: formData.status,
          featureId: formData.featureId,
          points: formData.points === "Sem estimativa" ? null : formData.points,
          modules: formData.modules,
          assigneeId: formData.assigneeId,
          projectId: resolvedProjectId
        });
        // Assign tags to newly created task
        if (formData.tags.length > 0 && newTask?.id) {
          await assignTagsMutation.mutateAsync({
            taskId: newTask.id,
            tagIds: formData.tags.map(t => t.id),
          });
        }
        // Success toast handled by hook
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erro:", error);
      // Toast handled by hook
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
                {filteredFeatures.map((feature) => (
                  <SelectItem key={feature.id} value={feature.id}>
                    {feature.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description with Markdown + AI Button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Descrição (Markdown)</Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <input
                    type="checkbox"
                    checked={includeProjectDocs}
                    onChange={(e) => setIncludeProjectDocs(e.target.checked)}
                    disabled={isGeneratingAI}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500 disabled:opacity-50"
                  />
                  Incluir docs
                </label>
                <AIImproveButton
                  onClick={handleAIGenerate}
                  isLoading={isGeneratingAI}
                  disabled={!formData.title.trim() || !formData.featureId}
                  label={formData.description?.trim() ? 'Melhorar' : 'Gerar'}
                  title={formData.description?.trim() ? 'Melhorar descrição com IA' : 'Gerar descrição com IA'}
                />
              </div>
            </div>
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

          {/* Modules and Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Módulos</Label>
              <ModuleTagInput
                value={formData.modules}
                onChange={(mods) => setFormData({ ...formData, modules: mods })}
                availableModules={availableModules}
                placeholder="Adicionar módulo..."
              />
            </div>

            {/* Tags - Multi-select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tags</Label>
              {resolvedProjectId ? (
                <TagSelector
                  projectId={resolvedProjectId}
                  selectedTags={formData.tags}
                  onTagsChange={(tags) => setFormData({ ...formData, tags })}
                  placeholder="Selecionar tags..."
                />
              ) : (
                <div className="text-sm text-muted-foreground p-2 border rounded-md">
                  Selecione uma feature para ver as tags
                </div>
              )}
            </div>
          </div>

          {/* Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
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
