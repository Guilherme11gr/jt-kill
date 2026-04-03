'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Search, Check, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Project {
  id: string;
  name: string;
  key: string;
}

interface Feature {
  id: string;
  title: string;
  status: string;
  epic?: {
    id: string;
    title: string;
    project?: {
      id: string;
      name: string;
      key: string;
    };
  } | null;
  _count?: {
    tasks: number;
  };
}

interface WeeklyGoalSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalAdded: () => void;
  existingGoalIds: string[];
}

function getStatusLabel(status: string): string {
  if (status === 'TODO') return 'A fazer';
  if (status === 'DOING') return 'Em progresso';
  return status;
}

function getStatusDot(status: string): string {
  if (status === 'TODO') return 'bg-blue-500';
  if (status === 'DOING') return 'bg-yellow-500';
  return 'bg-gray-400';
}

export function WeeklyGoalSelector({
  open,
  onOpenChange,
  onGoalAdded,
  existingGoalIds,
}: WeeklyGoalSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Step 1: fetch projects on open
  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const json = await res.json();
      const data: Project[] = (json.data || []).map((p: { id: string; name: string; key: string }) => ({
        id: p.id,
        name: p.name,
        key: p.key,
      }));
      setProjects(data);
    } catch {
      toast.error('Erro ao carregar projetos.');
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  // Step 2: fetch features for selected project
  const fetchFeatures = useCallback(async (projectId: string) => {
    setFeaturesLoading(true);
    try {
      const res = await fetch(`/api/features?projectId=${projectId}&statuses=TODO,DOING`);
      if (!res.ok) throw new Error('Failed to fetch features');
      const json = await res.json();
      const data: Feature[] = json.data || [];
      setFeatures(data);
    } catch {
      toast.error('Erro ao carregar features.');
    } finally {
      setFeaturesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && projects.length === 0 && !projectsLoading) {
      fetchProjects();
    }
  }, [open, projects.length, projectsLoading, fetchProjects]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSaving(false);
      setFeatures([]);
      setSelectedProject(null);
    }
  }, [open]);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setSearch('');
    fetchFeatures(project.id);
  };

  const handleBack = () => {
    setSelectedProject(null);
    setFeatures([]);
    setSearch('');
  };

  const handleSelect = async (featureId: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/weekly-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        if (res.status === 409) {
          toast.error('Esta feature ja e uma meta desta semana.');
        } else {
          toast.error(error?.message || 'Erro ao adicionar meta.');
        }
        return;
      }

      toast.success('Meta adicionada com sucesso!');
      onGoalAdded();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao adicionar meta.');
    } finally {
      setSaving(false);
    }
  };

  const filteredProjects = useMemo(() => {
    if (!search) return projects;
    const lower = search.toLowerCase();
    return projects.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.key.toLowerCase().includes(lower)
    );
  }, [projects, search]);

  const filteredFeatures = useMemo(() => {
    if (!search) return features;
    const lower = search.toLowerCase();
    return features.filter(f =>
      f.title.toLowerCase().includes(lower) ||
      f.epic?.title.toLowerCase().includes(lower)
    );
  }, [features, search]);

  const groupedByEpic = useMemo(() => {
    const map = new Map<string, { epicTitle: string; features: Feature[] }>();

    for (const f of filteredFeatures) {
      const key = f.epic?.id || '_no-epic';
      const title = f.epic?.title || 'Sem epic';
      if (!map.has(key)) map.set(key, { epicTitle: title, features: [] });
      map.get(key)!.features.push(f);
    }

    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      if (a.epicTitle === 'Sem epic') return 1;
      if (b.epicTitle === 'Sem epic') return -1;
      return a.epicTitle.localeCompare(b.epicTitle);
    });

    return groups;
  }, [filteredFeatures]);

  // --- Project selection view ---
  if (!selectedProject) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar meta da semana</DialogTitle>
            <DialogDescription>
              Primeiro, escolha o projeto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar projeto..."
                className="pl-9"
              />
            </div>

            <div className="max-h-[24rem] overflow-y-auto pr-1">
              {projectsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">
                    {search ? 'Nenhum projeto encontrado.' : 'Nenhum projeto disponivel.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate leading-tight">
                          {project.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {project.key}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        Selecionar
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // --- Feature selection view ---
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar meta da semana</DialogTitle>
          <DialogDescription>
            Projeto: {selectedProject.name} — selecione uma feature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-2 rounded-lg hover:bg-accent/50 flex-shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar feature ou epic..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="max-h-[24rem] overflow-y-auto pr-1">
            {featuresLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFeatures.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">
                  {search
                    ? 'Nenhuma feature encontrada.'
                    : 'Nenhuma feature disponivel (TODO ou DOING).'}
                </p>
              </div>
            ) : (
              groupedByEpic.map((group) => (
                <div key={group.epicTitle} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-2 px-1 pb-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {group.epicTitle}
                    </p>
                    <span className="text-[10px] text-muted-foreground/60">
                      {group.features.length}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {group.features.map((feature) => {
                      const isAlreadyGoal = existingGoalIds.includes(feature.id);
                      const subtitleParts: string[] = [];
                      if (feature._count?.tasks != null) {
                        subtitleParts.push(`${feature._count.tasks} ${feature._count.tasks === 1 ? 'task' : 'tasks'}`);
                      }
                      if (feature.status) subtitleParts.push(getStatusLabel(feature.status));

                      return (
                        <button
                          key={feature.id}
                          onClick={() => !isAlreadyGoal && handleSelect(feature.id)}
                          disabled={isAlreadyGoal || saving}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent group"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDot(feature.status)}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate leading-tight">
                              {feature.title}
                            </p>
                            {subtitleParts.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {subtitleParts.join(' · ')}
                              </p>
                            )}
                          </div>
                          {isAlreadyGoal ? (
                            <span className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 flex-shrink-0">
                              <Check className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              Adicionar
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
