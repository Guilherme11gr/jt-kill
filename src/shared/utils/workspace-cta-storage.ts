/**
 * LocalStorage keys for workspace CTA
 */
export const STORAGE_KEYS = {
  CTA_STATE: 'jt-workspace-cta-state',
  USER_ENGAGEMENT: 'jt-user-engagement',
} as const;

/**
 * CTA state stored in localStorage
 */
export interface WorkspaceCTAState {
  userId: string;
  lastDismissedAt?: string; // ISO string
  dismissCount: number;
  workspaceCreated: boolean;
  lastShownAt?: string;
}

/**
 * User engagement metrics (localStorage)
 */
export interface UserEngagementMetrics {
  userId: string;
  sessionCount: number;
  taskInteractions: number; // create, edit, update tasks
  lastActivityAt: string;
  firstSessionAt: string;
}

/**
 * Get CTA state from localStorage
 */
export function getCTAState(userId: string): WorkspaceCTAState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CTA_STATE);
    if (!stored) return null;
    
    const state = JSON.parse(stored) as WorkspaceCTAState;
    
    // Only return if it's for the current user
    if (state.userId !== userId) return null;
    
    return state;
  } catch {
    return null;
  }
}

/**
 * Save CTA state to localStorage
 */
export function saveCTAState(state: WorkspaceCTAState): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.CTA_STATE, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save CTA state:', e);
  }
}

/**
 * Get user engagement metrics
 */
export function getEngagementMetrics(userId: string): UserEngagementMetrics | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_ENGAGEMENT);
    if (!stored) return null;
    
    const metrics = JSON.parse(stored) as UserEngagementMetrics;
    
    // Only return if it's for the current user
    if (metrics.userId !== userId) return null;
    
    return metrics;
  } catch {
    return null;
  }
}

/**
 * Save engagement metrics
 */
export function saveEngagementMetrics(metrics: UserEngagementMetrics): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.USER_ENGAGEMENT, JSON.stringify(metrics));
  } catch (e) {
    console.error('Failed to save engagement metrics:', e);
  }
}

/**
 * Track new session
 */
export function trackSession(userId: string): void {
  const existing = getEngagementMetrics(userId);
  const now = new Date().toISOString();
  
  if (existing) {
    saveEngagementMetrics({
      ...existing,
      sessionCount: existing.sessionCount + 1,
      lastActivityAt: now,
    });
  } else {
    saveEngagementMetrics({
      userId,
      sessionCount: 1,
      taskInteractions: 0,
      lastActivityAt: now,
      firstSessionAt: now,
    });
  }
}

/**
 * Track task interaction (create, edit, status change)
 */
export function trackTaskInteraction(userId: string): void {
  const existing = getEngagementMetrics(userId);
  const now = new Date().toISOString();
  
  if (existing) {
    saveEngagementMetrics({
      ...existing,
      taskInteractions: existing.taskInteractions + 1,
      lastActivityAt: now,
    });
  } else {
    // Initialize if doesn't exist
    saveEngagementMetrics({
      userId,
      sessionCount: 1,
      taskInteractions: 1,
      lastActivityAt: now,
      firstSessionAt: now,
    });
  }
}

/**
 * Mark CTA as dismissed
 */
export function dismissCTA(userId: string): void {
  const existing = getCTAState(userId);
  const now = new Date().toISOString();
  
  if (existing) {
    saveCTAState({
      ...existing,
      lastDismissedAt: now,
      dismissCount: existing.dismissCount + 1,
    });
  } else {
    saveCTAState({
      userId,
      lastDismissedAt: now,
      dismissCount: 1,
      workspaceCreated: false,
    });
  }
}

/**
 * Mark workspace as created (stop showing CTA)
 */
export function markWorkspaceCreated(userId: string): void {
  const existing = getCTAState(userId);
  
  if (existing) {
    saveCTAState({
      ...existing,
      workspaceCreated: true,
    });
  } else {
    saveCTAState({
      userId,
      dismissCount: 0,
      workspaceCreated: true,
    });
  }
}

/**
 * Clear all CTA data (for logout or user change)
 */
export function clearCTAData(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEYS.CTA_STATE);
    localStorage.removeItem(STORAGE_KEYS.USER_ENGAGEMENT);
  } catch (e) {
    console.error('Failed to clear CTA data:', e);
  }
}
