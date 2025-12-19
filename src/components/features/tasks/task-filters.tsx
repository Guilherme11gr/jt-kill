'use client';

import { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TaskStatus, TaskPriority } from '@/shared/types';

export interface TaskFiltersState {
  search: string;
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  module: string | 'all';
}

interface TaskFiltersProps {
  filters: TaskFiltersState;
  onChange: (filters: TaskFiltersState) => void;
  modules?: string[];
  className?: string;
}

const STATUS_OPTIONS: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos Status' },
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'TODO', label: 'Todo' },
  { value: 'DOING', label: 'Doing' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'QA_READY', label: 'QA Ready' },
  { value: 'DONE', label: 'Done' },
];

const PRIORITY_OPTIONS: { value: TaskPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas Prioridades' },
  { value: 'CRITICAL', label: 'Crítico' },
  { value: 'HIGH', label: 'Alto' },
  { value: 'MEDIUM', label: 'Médio' },
  { value: 'LOW', label: 'Baixo' },
];

export function TaskFilters({ filters, onChange, modules = [], className }: TaskFiltersProps) {
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.status !== 'all' ||
      filters.priority !== 'all' ||
      filters.module !== 'all'
    );
  }, [filters]);

  const clearFilters = () => {
    onChange({ search: '', status: 'all', priority: 'all', module: 'all' });
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tasks..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Status */}
        <Select
          value={filters.status}
          onValueChange={(value) =>
            onChange({ ...filters, status: value as TaskStatus | 'all' })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select
          value={filters.priority}
          onValueChange={(value) =>
            onChange({ ...filters, priority: value as TaskPriority | 'all' })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Module (if available) */}
        {modules.length > 0 && (
          <Select
            value={filters.module}
            onValueChange={(value) => onChange({ ...filters, module: value })}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Módulos</SelectItem>
              {modules.map((mod) => (
                <SelectItem key={mod} value={mod}>
                  {mod}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear button */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
            <X className="w-3.5 h-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {/* Active filters badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Busca: {filters.search}
            </Badge>
          )}
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
            </Badge>
          )}
          {filters.priority !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Prioridade: {filters.priority}
            </Badge>
          )}
          {filters.module !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Módulo: {filters.module}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
