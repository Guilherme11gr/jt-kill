import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateDashboardQueries } from '../helpers';
import { queryKeys } from '../query-keys';
import { CACHE_TIMES } from '../cache-config';
import { toast } from 'sonner';

// ============ Types ============

interface Project {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  modules?: string[];
  _count?: { epics: number; tasks: number };
}




interface CreateProjectInput {
  name: string;
  key: string;
  description?: string;
  modules?: string[];
}

interface UpdateProjectInput {
  id: string;
  data: Partial<CreateProjectInput>;
}

// ============ Fetch Functions ============

async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects');
  if (!res.ok) throw new Error('Failed to fetch projects');
  const json = await res.json();
  return json.data || [];
}

async function fetchProject(id: string): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`);
  if (!res.ok) throw new Error('Failed to fetch project');
  const json = await res.json();
  return json.data;
}



async function createProject(data: CreateProjectInput): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create project');
  const json = await res.json();
  return json.data;
}

async function updateProject({ id, data }: UpdateProjectInput): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update project');
  const json = await res.json();
  return json.data;
}

async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
}

// ============ Hooks ============

/**
 * Fetch all projects for the current org
 */
export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: fetchProjects,
    ...CACHE_TIMES.STANDARD,
  });
}

/**
 * Fetch a single project by ID
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => fetchProject(id),
    enabled: Boolean(id),
    ...CACHE_TIMES.STANDARD,
  });
}



/**
 * Extract unique modules from all projects
 */
export function useModules() {
  const { data: projects, ...rest } = useProjects();

  const modules = projects
    ? Array.from(
      new Set(projects.flatMap((p) => p.modules || []))
    ).sort()
    : [];

  return { data: modules, ...rest };
}

/**
 * Get modules for a specific project
 * @param projectId - The project ID to get modules for
 */
export function useModulesByProject(projectId: string | undefined) {
  const { data: projects, ...rest } = useProjects();

  const modules = projects && projectId
    ? projects.find((p) => p.id === projectId)?.modules || []
    : [];

  return { data: modules, ...rest };
}

// ============ Mutations ============

/**
 * Create a new project
 */
/**
 * Create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: (newProject) => {
      // 1. Update the list
      queryClient.setQueryData<Project[]>(queryKeys.projects.list(), (old) => {
        if (!old) return [newProject];
        return [...old, newProject];
      });

      // 2. Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });

      // 3. Invalidate Dashboard Active Projects (new project might be active soon)
      invalidateDashboardQueries(queryClient);

      toast.success('Projeto criado');
    },
    onError: () => {
      toast.error('Erro ao criar projeto');
    },
  });
}

/**
 * Update a project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProject,
    onSuccess: (updatedProject, variables) => {
      // 1. Optimistic update: update the specific project in cache
      queryClient.setQueryData<Project>(
        queryKeys.projects.detail(variables.id),
        updatedProject
      );

      // 2. Update in list immediately
      queryClient.setQueryData<Project[]>(queryKeys.projects.list(), (old) => {
        if (!old) return old;
        return old.map((p) => (p.id === variables.id ? updatedProject : p));
      });

      // 3. Invalidate for consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });

      // 4. Invalidate Dashboard
      invalidateDashboardQueries(queryClient);
      toast.success('Projeto atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar projeto');
    },
  });
}

/**
 * Delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      invalidateDashboardQueries(queryClient);
      toast.success('Projeto excluído');
    },
    onError: () => {
      toast.error('Erro ao excluir projeto');
    },
  });
}

