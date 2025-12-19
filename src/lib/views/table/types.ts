import type { TaskWithReadableId } from '@/shared/types';

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  flex?: boolean;
  sortable?: boolean;
}

export interface TaskTableProps {
  tasks: TaskWithReadableId[];
  onTaskClick?: (task: TaskWithReadableId) => void;
  isLoading?: boolean;
}

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

export const TABLE_COLUMNS: TableColumn[] = [
  { key: 'readableId', label: 'ID', width: '100px', sortable: true },
  { key: 'title', label: 'Título', flex: true, sortable: true },
  { key: 'status', label: 'Status', width: '120px', sortable: true },
  { key: 'priority', label: 'Prioridade', width: '100px', sortable: true },
  { key: 'module', label: 'Módulo', width: '100px', sortable: true },
  { key: 'points', label: 'Pts', width: '60px', sortable: true },
];
