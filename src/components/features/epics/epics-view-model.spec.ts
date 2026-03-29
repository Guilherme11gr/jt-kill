import { describe, expect, it } from 'vitest';
import {
  filterProjectEpics,
  normalizeEpicStatus,
  splitProjectEpicsByStatus,
  type ProjectEpicListItem,
} from './epics-view-model';

const epics: ProjectEpicListItem[] = [
  {
    id: 'epic-1',
    title: 'Checkout revamp',
    description: 'Melhora do funil de pagamento',
    status: 'OPEN',
    _count: { features: 3 },
  },
  {
    id: 'epic-2',
    title: 'Billing cleanup',
    description: 'Encerrar pendencias antigas',
    status: 'CLOSED',
    _count: { features: 2 },
  },
  {
    id: 'epic-3',
    title: 'Observability',
    description: 'Logs e alertas',
    status: 'unexpected-server-value',
    _count: { features: 1 },
  },
];

describe('epics-view-model', () => {
  it('normalizes unknown statuses to OPEN for UI safety', () => {
    expect(normalizeEpicStatus('OPEN')).toBe('OPEN');
    expect(normalizeEpicStatus('CLOSED')).toBe('CLOSED');
    expect(normalizeEpicStatus('IN_PROGRESS')).toBe('OPEN');
  });

  it('filters epics by search and status', () => {
    expect(filterProjectEpics(epics, 'billing', 'all')).toEqual([epics[1]]);
    expect(filterProjectEpics(epics, '', 'CLOSED')).toEqual([epics[1]]);
    expect(filterProjectEpics(epics, 'logs', 'OPEN')).toEqual([epics[2]]);
  });

  it('splits epics into open and closed buckets', () => {
    expect(splitProjectEpicsByStatus(epics)).toEqual({
      openEpics: [epics[0], epics[2]],
      closedEpics: [epics[1]],
    });
  });
});
