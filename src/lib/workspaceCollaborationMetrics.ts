/**
 * Workspace Collaboration Metrics
 *
 * Tracks key metrics for observability:
 * - invite_acceptance
 * - multi_member_workspaces
 * - switcher_usage
 * - permission_failures
 *
 * In production, wire to your analytics/monitoring (e.g. Vercel Analytics, PostHog, Datadog).
 * Events are logged when VITE_DEBUG_LOGGING is enabled.
 */

import { logger } from './logger';

export type WorkspaceMetricEvent =
  | { name: 'invite_acceptance'; workspaceId: string; role: string }
  | { name: 'multi_member_workspace'; workspaceId: string; memberCount: number }
  | { name: 'switcher_usage'; fromWorkspaceId: string; toWorkspaceId: string }
  | { name: 'permission_failure'; workspaceId: string; action: string; role: string };

const METRIC_SCOPE = 'WORKSPACE_COLLAB';

function emit(event: WorkspaceMetricEvent): void {
  // Log for debugging when VITE_DEBUG_LOGGING is enabled
  logger.debug(METRIC_SCOPE, `Metric: ${event.name}`, event);

  // Hook for analytics: dispatch custom event that can be captured by analytics scripts
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('wellthy:workspace-metric', { detail: event })
    );
  }
}

/** Track when a user accepts a workspace invitation */
export function trackInviteAcceptance(workspaceId: string, role: string): void {
  emit({ name: 'invite_acceptance', workspaceId, role });
}

/** Track workspaces with multiple members (collaboration indicator) */
export function trackMultiMemberWorkspace(
  workspaceId: string,
  memberCount: number
): void {
  if (memberCount < 2) return;
  emit({ name: 'multi_member_workspace', workspaceId, memberCount });
}

/** Track workspace switcher usage */
export function trackSwitcherUsage(
  fromWorkspaceId: string,
  toWorkspaceId: string
): void {
  if (fromWorkspaceId === toWorkspaceId) return;
  emit({ name: 'switcher_usage', fromWorkspaceId, toWorkspaceId });
}

/** Track permission denial (suspected cross-workspace or role violation) */
export function trackPermissionFailure(
  workspaceId: string,
  action: string,
  role: string
): void {
  emit({ name: 'permission_failure', workspaceId, action, role });
}
