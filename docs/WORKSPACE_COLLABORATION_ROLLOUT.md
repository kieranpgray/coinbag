# Workspace Collaboration Rollout & Rollback

Operational guide for the multi-user workspace collaboration feature.

## Feature Flag

- **Flag**: `workspace_collaboration`
- **Config**: `src/lib/workspaceCollaborationConfig.ts`
- **Gating**: `isFeatureEnabled('workspace_collaboration')` and optionally `isWorkspaceCollaborationEnabledForUser(userId)` for user-level rollout

## Rollout Stages

| Stage | Env | Description |
|-------|-----|-------------|
| **off** | `VITE_WORKSPACE_COLLAB_STAGE=off` (default) | Feature disabled; Team tab, WorkspaceSwitcher, invite flows hidden |
| **internal** | `VITE_WORKSPACE_COLLAB_STAGE=internal` | Only users in `VITE_WORKSPACE_COLLAB_INTERNAL_IDS` (comma-separated Clerk user IDs) |
| **percentage** | `VITE_WORKSPACE_COLLAB_STAGE=percentage` | `VITE_WORKSPACE_COLLAB_ROLLOUT_PCT` (0–100) of users by deterministic hash |
| **full** | `VITE_WORKSPACE_COLLAB_STAGE=full` | All users |

### Environment Variables

```bash
# Stage: off | internal | percentage | full
# For local development, set to 'full' to enable the feature
VITE_WORKSPACE_COLLAB_STAGE=internal

# For internal: comma-separated Clerk user IDs
VITE_WORKSPACE_COLLAB_INTERNAL_IDS=user_xxx,user_yyy

# For percentage: 0-100
VITE_WORKSPACE_COLLAB_ROLLOUT_PCT=25
```

## Key Metrics

Tracked via `src/lib/workspaceCollaborationMetrics.ts`:

| Metric | Event | Use |
|--------|-------|-----|
| Invite acceptance | `invite_acceptance` | Adoption, funnel |
| Multi-member workspaces | `multi_member_workspace` | Collaboration adoption |
| Switcher usage | `switcher_usage` | UX, multi-workspace usage |
| Permission failures | `permission_failure` | Suspected cross-workspace violations |

Events are emitted as `wellthy:workspace-metric` custom events; wire to your analytics (Vercel Analytics, PostHog, etc.).

## Alerting Queries

Run `scripts/alerting-cross-workspace-violations.sql` periodically:

- Unusually high membership churn
- Invite resend abuse (enumeration)
- Orphaned invitations
- Expired pending count
- Multi-member workspace count

## Rollback

### 1. Disable Feature Flag

Set:

```bash
VITE_WORKSPACE_COLLAB_STAGE=off
```

Redeploy. This hides:

- Team tab in Settings
- WorkspaceSwitcher in header/nav
- Invite create/accept flows in UI

### 2. Preserve Data

- **No data deletion**. Workspaces, memberships, and invitations remain in the database.
- RLS and constraints stay in place.
- Users can still access their default workspace; multi-workspace UI is simply hidden.

### 3. Revert Route/UI Exposure

If you need to fully remove routes:

- Remove or hide the Team tab from `SettingsPage.tsx` (already gated by feature flag in practice).
- Remove `WorkspaceSwitcher` from `Header.tsx` / `MobileNav.tsx` when flag is off.
- Invite accept route (e.g. `/invite/accept?token=...`) can remain; it will 404 or redirect when flag is off if you add that logic.

### 4. Database Rollback (Optional, Advanced)

Only if you must fully revert schema:

- See `docs/WORKSPACE_MIGRATION.md` for domain-table rollback.
- Workspaces schema (`workspaces`, `workspace_memberships`, `workspace_invitations`) can be left as-is; it is harmless when the feature is disabled.

## Verification After Rollback

1. Confirm `VITE_WORKSPACE_COLLAB_STAGE=off` in production env.
2. Verify Team tab and WorkspaceSwitcher are not visible.
3. Confirm existing user data (categories, goals, preferences) still loads correctly.
4. Run `scripts/check-workspace-migration.sql` to ensure schema integrity.
