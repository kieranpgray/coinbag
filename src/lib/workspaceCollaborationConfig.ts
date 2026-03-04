/**
 * Workspace Collaboration Rollout Configuration
 *
 * Staged rollout: internal -> percentage -> full
 * - internal: Only users in VITE_WORKSPACE_COLLAB_INTERNAL_IDS (comma-separated Clerk user IDs)
 * - percentage: VITE_WORKSPACE_COLLAB_ROLLOUT_PCT (0-100) of users by hash
 * - full: All users
 */

export type WorkspaceCollaborationRolloutStage =
  | 'off'
  | 'internal'
  | 'percentage'
  | 'full';

const INTERNAL_IDS_ENV = import.meta.env.VITE_WORKSPACE_COLLAB_INTERNAL_IDS ?? '';
const ROLLOUT_PCT_ENV = import.meta.env.VITE_WORKSPACE_COLLAB_ROLLOUT_PCT ?? '0';
const STAGE_ENV = import.meta.env.VITE_WORKSPACE_COLLAB_STAGE ?? 'off';

function parseInternalIds(): Set<string> {
  if (!INTERNAL_IDS_ENV || typeof INTERNAL_IDS_ENV !== 'string') {
    return new Set();
  }
  return new Set(
    INTERNAL_IDS_ENV.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function hashUserId(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h << 5) - h + userId.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Get the current rollout stage from env.
 * Valid values: off | internal | percentage | full
 */
export function getWorkspaceCollaborationRolloutStage(): WorkspaceCollaborationRolloutStage {
  const v = String(STAGE_ENV).toLowerCase();
  if (v === 'internal' || v === 'percentage' || v === 'full') {
    return v;
  }
  return 'off';
}

/**
 * Check if workspace collaboration is enabled for a specific user.
 * Use when you have a Clerk user ID (e.g. from useUser).
 */
export function isWorkspaceCollaborationEnabledForUser(
  userId: string | undefined
): boolean {
  const stage = getWorkspaceCollaborationRolloutStage();
  if (stage === 'off') return false;
  if (!userId) return false;

  if (stage === 'internal') {
    const internalIds = parseInternalIds();
    return internalIds.has(userId);
  }

  if (stage === 'percentage') {
    const pct = Math.min(100, Math.max(0, parseInt(ROLLOUT_PCT_ENV, 10) || 0));
    if (pct >= 100) return true;
    if (pct <= 0) return false;
    const bucket = hashUserId(userId) % 100;
    return bucket < pct;
  }

  return stage === 'full';
}
