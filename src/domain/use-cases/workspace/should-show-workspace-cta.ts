import type { UserProfile } from '@/providers/auth-provider';
import { 
  getCTAState, 
  getEngagementMetrics, 
  type WorkspaceCTAState, 
  type UserEngagementMetrics 
} from '@/shared/utils/workspace-cta-storage';

/**
 * Configuration constants
 */
const CONFIG = {
  MAX_DISMISSALS: 3, // Stop showing after 3 dismissals
  MIN_SESSIONS: 3, // Show after 3 sessions
  MIN_TASK_INTERACTIONS: 5, // Show after 5 task interactions
  MIN_DAYS: 7, // Show after 7 days since signup
  REDISMISS_DAYS: 7, // Re-show after 7 days if dismissed
} as const;

/**
 * Check if user should see the workspace creation CTA
 */
export function shouldShowWorkspaceCTA(
  profile: UserProfile | null
): boolean {
  if (!profile) return false;
  
  // Only show to MEMBERs (not OWNER or ADMIN)
  if (profile.currentRole !== 'MEMBER') return false;
  
  const ctaState = getCTAState(profile.id);
  const engagement = getEngagementMetrics(profile.id);
  
  // Already created workspace? Never show
  if (ctaState?.workspaceCreated) return false;
  
  // Dismissed 3+ times? Stop showing
  if (ctaState && ctaState.dismissCount >= CONFIG.MAX_DISMISSALS) return false;
  
  // Dismissed recently? Wait 7 days
  if (ctaState?.lastDismissedAt) {
    const daysSinceDismissal = daysSince(new Date(ctaState.lastDismissedAt));
    if (daysSinceDismissal < CONFIG.REDISMISS_DAYS) return false;
  }
  
  // No engagement data yet? Don't show (need at least 1 session tracked)
  if (!engagement) return false;
  
  // Check engagement triggers
  const hasMinSessions = engagement.sessionCount >= CONFIG.MIN_SESSIONS;
  const hasMinInteractions = engagement.taskInteractions >= CONFIG.MIN_TASK_INTERACTIONS;
  const hasMinDays = daysSince(new Date(engagement.firstSessionAt)) >= CONFIG.MIN_DAYS;
  
  // Show if ANY trigger met
  return hasMinSessions || hasMinInteractions || hasMinDays;
}

/**
 * Get the trigger reason (for analytics)
 */
export function getCTATrigger(
  engagement: UserEngagementMetrics | null
): 'sessions' | 'interactions' | 'days' | null {
  if (!engagement) return null;
  
  if (engagement.sessionCount >= CONFIG.MIN_SESSIONS) return 'sessions';
  if (engagement.taskInteractions >= CONFIG.MIN_TASK_INTERACTIONS) return 'interactions';
  if (daysSince(new Date(engagement.firstSessionAt)) >= CONFIG.MIN_DAYS) return 'days';
  
  return null;
}

/**
 * Helper: Calculate days since a date
 */
function daysSince(date: Date): number {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
