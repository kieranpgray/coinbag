-- Alerting queries for suspected cross-workspace policy violations
-- Run periodically (e.g. cron) or via monitoring dashboards
-- Requires service role or admin access to audit logs / pg_stat / application logs
--
-- Note: Supabase does not expose per-query RLS denials by default.
-- These queries help identify anomalies that may indicate policy violations.
-- For full audit, enable Supabase audit log or pgAudit.

-- 1. Workspaces with unusually high membership churn (potential abuse)
-- Run weekly; alert if count > threshold
SELECT
  w.id AS workspace_id,
  w.name,
  COUNT(wm.id) AS current_members,
  (SELECT COUNT(*) FROM workspace_invitations wi
   WHERE wi.workspace_id = w.id AND wi.accepted_at IS NOT NULL
     AND wi.accepted_at > now() - interval '7 days') AS recent_acceptances
FROM workspaces w
LEFT JOIN workspace_memberships wm ON wm.workspace_id = w.id
GROUP BY w.id, w.name
HAVING COUNT(wm.id) > 20  -- Adjust threshold
ORDER BY current_members DESC;

-- 2. Pending invites that have been resent many times (potential enumeration)
-- Alert if same (workspace_id, email) has multiple resends in short window
SELECT
  workspace_id,
  email,
  COUNT(*) AS invite_count,
  MIN(created_at) AS first_created,
  MAX(updated_at) AS last_updated
FROM workspace_invitations
WHERE accepted_at IS NULL
  AND created_at > now() - interval '30 days'
GROUP BY workspace_id, email
HAVING COUNT(*) > 5
ORDER BY invite_count DESC;

-- 3. Orphaned invitations (workspace deleted but invites remain - edge case)
-- Should be 0 if CASCADE is working
SELECT wi.id, wi.workspace_id, wi.email
FROM workspace_invitations wi
LEFT JOIN workspaces w ON w.id = wi.workspace_id
WHERE w.id IS NULL;

-- 4. Expired invites still pending (cleanup candidate)
SELECT COUNT(*) AS expired_pending_count
FROM workspace_invitations
WHERE accepted_at IS NULL AND expires_at < now();

-- 5. Multi-member workspaces count (health metric)
SELECT
  COUNT(*) AS multi_member_workspace_count
FROM (
  SELECT workspace_id
  FROM workspace_memberships
  GROUP BY workspace_id
  HAVING COUNT(*) > 1
) t;
