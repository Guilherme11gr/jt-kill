'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Search, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Epic {
  id: string;
  title: string;
  project?: {
    id: string;
    name: string;
    key: string;
  };
}

interface Feature {
  id: string;
  title: string;
  status: string;
  epic?: Epic | null;
  _count?: {
    tasks: number;
  };
}

type StatusFilter = 'ALL' | 'TODO' | 'DOING';

interface WeeklyGoalSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalAdded: () => void;
  existingGoalIds: string[];
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    TODO: 'A Fazer',
    DOING: 'Fazendo',
    DONE: 'Feito',
    BACKLOG: 'Backlog',
  };
  return labels[status] || status;
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'TODO':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'DOING':
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
    default:
      return '';
  }
}

const EPIC_COLORS = [
  'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
];

function getEpicColorClass(epicId: string): string {
  let hash = 0;
  for (let i = 0; i < epicId.length; i++) {
    hash = epicId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return EPIC_COLORS[Math.abs(hash) % EPIC_COLORS.length];
}

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Todas' },
  { key: 'TODO', label: 'A Fazer' },
  { key: 'DOING', label: 'Fazendo' },
];

export function WeeklyGoalSelector({
  open,
  onOpenChange,
  onGoalAdded,
  existingGoalIds,
}: WeeklyGoalSelectorProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [epicFilter, setEpicFilter] = useState<string>('ALL');
  const [collapsedEpics, setCollapsedEpics] = useState<Set<string>>(new Set());
  const [fetched, setFetched] = useState(false);

  const fetchFeatures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/features?limit=100');
      if (!res.ok) throw new Error('Failed to fetch features');
      const json = await res.json();
      const data: Feature[] = json.data || [];
      const filtered = data.filter(
        (f) => f.status === 'TODO' || f.status === 'DOING'
      );
      setFeatures(filtered);
    } catch {
      toast.error('Erro ao carregar features.');
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, []);

  useEffect(() => {
    if (open && !fetched && !loading) {
      fetchFeatures();
    }
  }, [open, fetched, loading, fetchFeatures]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSaving(false);
      setStatusFilter('ALL');
      setEpicFilter('ALL');
      setCollapsedEpics(new Set());
      setFetched(false);
      setFeatures([]);
    }
  }, [open]);

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
          toast.error('Esta feature já é uma meta desta semana.');
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

  const toggleEpic = (epicId: string) => {
    setCollapsedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicId)) {
        next.delete(epicId);
      } else {
        next.add(epicId);
      }
      return next;
    });
  };

  const uniqueEpics = useMemo(() => {
    const map = new Map<string, Epic>();
    for (const f of features) {
      if (f.epic && !map.has(f.epic.id)) {
        map.set(f.epic.id, f.epic);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  }, [features]);

  const filteredFeatures = useMemo(() => {
    return features.filter((feature) => {
      const matchesStatus =
        statusFilter === 'ALL' || feature.status === statusFilter;
      const matchesEpic =
        epicFilter === 'ALL' || feature.epic?.id === epicFilter;
      const matchesSearch =
        !search ||
        feature.title.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesEpic && matchesSearch;
    });
  }, [features, statusFilter, epicFilter, search]);

  const groupedByEpic = useMemo(() => {
    const groups: Record<string, Feature[]> = {};
    for (const f of filteredFeatures) {
      const key = f.epic?.title || 'Sem epic';
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    }
    return groups;
  }, [filteredFeatures]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar meta da semana</DialogTitle>
          <DialogDescription>
            Selecione uma feature para acompanhar esta semana.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar feature..."
                className="pl-9"
              />
            </div>
            {uniqueEpics.length > 1 && (
              <Select value={epicFilter} onValueChange={setEpicFilter}>
                <SelectTrigger className="w-[160px] h-10">
                  <SelectValue placeholder="Epic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os epics</SelectItem>
                  {uniqueEpics.map((epic) => (
                    <SelectItem key={epic.id} value={epic.id}>
                      {epic.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-h-[22rem] overflow-y-auto space-y-3 pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(groupedByEpic).length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">
                  {search || statusFilter !== 'ALL' || epicFilter !== 'ALL'
                    ? 'Nenhuma feature encontrada.'
                    : 'Nenhuma feature disponível.'}
                </p>
              </div>
            ) : (
              Object.entries(groupedByEpic).map(([epicTitle, epicFeatures]) => {
                const epicId = epicFeatures[0]?.epic?.id ?? 'no-epic';
                const isCollapsed = collapsedEpics.has(epicId);
                const epicColor =
                  epicId === 'no-epic'
                    ? 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                    : getEpicColorClass(epicId);

                return (
                  <div key={epicId} className="space-y-1">
                    {uniqueEpics.length > 1 && epicId !== 'no-epic' && (
                      <button
                        onClick={() => toggleEpic(epicId)}
                        className="w-full flex items-center gap-2 px-1 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium ${epicColor}`}
                        >
                          {epicTitle}
                        </Badge>
                        <span className="text-muted-foreground/70">
                          {epicFeatures.length}
                        </span>
                      </button>
                    )}

                    {!isCollapsed &&
                      epicFeatures.map((feature) => {
                        const isAlreadyGoal =
                          existingGoalIds.includes(feature.id);

                        return (
                          <button
                            key={feature.id}
                            onClick={() =>
                              !isAlreadyGoal && handleSelect(feature.id)
                            }
                            disabled={isAlreadyGoal || saving}
                            className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {feature.title}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={`flex-shrink-0 text-[10px] ${getStatusBadgeClass(feature.status)}`}
                                >
                                  {getStatusLabel(feature.status)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                {feature.epic && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${epicColor}`}
                                  >
                                    {feature.epic.title}
                                  </Badge>
                                )}
                                {feature._count?.tasks !== undefined && (
                                  <span className="text-[10px] text-muted-foreground/70">
                                    {feature._count.tasks}{' '}
                                    {feature._count.tasks === 1
                                      ? 'task'
                                      : 'tasks'}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isAlreadyGoal ? (
                              <Badge
                                variant="outline"
                                className="flex-shrink-0 gap-1 border-green-500/30 text-green-600 dark:text-green-400"
                              >
                                <Check className="h-3 w-3" />
                                Na semana
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-shrink-0 h-7 px-2.5 text-xs"
                                disabled={saving}
                              >
                                Adicionar
                              </Button>
                            )}
                          </button>
                        );
                      })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
