export interface ProjectEpicListItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  updatedAt?: string | null;
  _count?: { features: number };
  risk?: 'low' | 'medium' | 'high';
  riskReason?: string | null;
  riskUpdatedAt?: string | null;
}

export type ProjectEpicStatusFilter = 'all' | 'OPEN' | 'CLOSED';
export type NormalizedEpicStatus = 'OPEN' | 'CLOSED';

export function normalizeEpicStatus(status: string): NormalizedEpicStatus {
  return status === 'CLOSED' ? 'CLOSED' : 'OPEN';
}

export function filterProjectEpics(
  epics: ProjectEpicListItem[],
  search: string,
  statusFilter: ProjectEpicStatusFilter
): ProjectEpicListItem[] {
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

  return epics.filter((epic) => {
    const normalizedStatus = normalizeEpicStatus(epic.status);
    const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;

    if (!matchesStatus) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = `${epic.title} ${epic.description || ''}`.toLocaleLowerCase('pt-BR');
    return haystack.includes(normalizedSearch);
  });
}

export function splitProjectEpicsByStatus(epics: ProjectEpicListItem[]) {
  return {
    openEpics: epics.filter((epic) => normalizeEpicStatus(epic.status) === 'OPEN'),
    closedEpics: epics.filter((epic) => normalizeEpicStatus(epic.status) === 'CLOSED'),
  };
}
