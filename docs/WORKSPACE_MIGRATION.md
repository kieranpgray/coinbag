# Workspace Migration - Operational Guide

Operational documentation for the workspace context rollout on domain tables (`categories`, `goals`, `user_preferences`).

## Overview

- **Migration**: `20260226120000_workspace_context_domain_tables.sql`
- **Prerequisite**: `20260226000000_create_workspaces_schema.sql`
- **Scope**: Adds nullable `workspace_id`, backfills ownership from `user_id`, updates RLS to membership-based with user fallback

### workspace_id on insert

- **During migration**: `workspace_id` is nullable; backfill sets it for existing rows.
- **After migration**: A `BEFORE INSERT` trigger sets `workspace_id` from `get_default_workspace_id_for_user(user_id)` when it is NULL. Clients may omit `workspace_id` during the transition period; it will be populated automatically.

## Rollback Steps

If you need to revert the domain-table workspace migration:

1. **Restore original RLS policies** (user-scoped only):

   ```sql
   -- categories
   DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
   CREATE POLICY "Users can view their own categories" ON categories FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);
   DROP POLICY IF EXISTS "Users can create their own categories" ON categories;
   CREATE POLICY "Users can create their own categories" ON categories FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
   DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
   CREATE POLICY "Users can update their own categories" ON categories FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
   DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;
   CREATE POLICY "Users can delete their own categories" ON categories FOR DELETE USING ((auth.jwt() ->> 'sub') = user_id);

   -- goals
   DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
   CREATE POLICY "Users can view their own goals" ON goals FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);
   DROP POLICY IF EXISTS "Users can create their own goals" ON goals;
   CREATE POLICY "Users can create their own goals" ON goals FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
   DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
   CREATE POLICY "Users can update their own goals" ON goals FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
   DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;
   CREATE POLICY "Users can delete their own goals" ON goals FOR DELETE USING ((auth.jwt() ->> 'sub') = user_id);

   -- user_preferences
   DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
   CREATE POLICY "Users can view their own preferences" ON user_preferences FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);
   DROP POLICY IF EXISTS "Users can create their own preferences" ON user_preferences;
   CREATE POLICY "Users can create their own preferences" ON user_preferences FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
   DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
   CREATE POLICY "Users can update their own preferences" ON user_preferences FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
   DROP POLICY IF EXISTS "Users can delete their own preferences" ON user_preferences;
   CREATE POLICY "Users can delete their own preferences" ON user_preferences FOR DELETE USING ((auth.jwt() ->> 'sub') = user_id);
   ```

2. **Drop indexes and columns**:

   ```sql
   DROP INDEX IF EXISTS idx_goals_workspace_name_unique ON goals;
   DROP INDEX IF EXISTS idx_categories_workspace_id ON categories;
   DROP INDEX IF EXISTS idx_goals_workspace_id ON goals;
   DROP INDEX IF EXISTS idx_user_preferences_workspace_id ON user_preferences;
   ALTER TABLE categories DROP COLUMN IF EXISTS workspace_id;
   ALTER TABLE goals DROP COLUMN IF EXISTS workspace_id;
   ALTER TABLE user_preferences DROP COLUMN IF EXISTS workspace_id;
   ```

3. **Drop triggers and helper functions**:

   ```sql
   DROP TRIGGER IF EXISTS trigger_categories_set_workspace_id ON categories;
   DROP TRIGGER IF EXISTS trigger_goals_set_workspace_id ON goals;
   DROP TRIGGER IF EXISTS trigger_user_preferences_set_workspace_id ON user_preferences;
   DROP FUNCTION IF EXISTS set_workspace_id_on_insert();
   DROP FUNCTION IF EXISTS get_default_workspace_id_for_user(text);
   ```

**Note**: The workspaces schema (`workspaces`, `workspace_memberships`, `workspace_invitations`) is unchanged by rollback. Workspaces created during backfill remain; they are orphaned from domain tables but harmless.

## Checkpoints

| Checkpoint | Description | Verification |
|------------|-------------|--------------|
| **Pre-migration** | Workspaces schema applied, domain tables exist | `scripts/check-workspace-migration.sql` (workspace tables) |
| **Post-columns** | `workspace_id` added to categories, goals, user_preferences | `\d categories` etc. shows `workspace_id` |
| **Post-backfill** | All rows with valid `user_id` have `workspace_id` set | Migration assertion (Step 5b); fails if any NULL remain |
| **Post-RLS** | Policies updated; app uses membership + user fallback | Run verification script; test app access |

## Idempotency Strategy

The migration is designed to be **re-runnable** (idempotent):

| Step | Idempotency mechanism |
|------|------------------------|
| Add columns | `ADD COLUMN IF NOT EXISTS` |
| Create indexes | `CREATE INDEX IF NOT EXISTS` |
| Goals deduplication | Updates only duplicate names (idempotent after first run) |
| Backfill | `WHERE workspace_id IS NULL` — only updates rows not yet backfilled |
| Create unique index | `CREATE UNIQUE INDEX IF NOT EXISTS` (after backfill) |
| Trigger | `CREATE OR REPLACE FUNCTION`; trigger creation is idempotent |
| RLS policies | `DROP POLICY IF EXISTS` before `CREATE POLICY` |

**Re-run behaviour**:

- If migration completes successfully: re-running is a no-op (all `workspace_id` set; backfill loop updates 0 rows).
- If migration fails mid-way (e.g. after backfill, before RLS): re-run will skip already-backfilled rows and complete remaining steps.
- Post-backfill assertion (Step 5b) ensures migration fails if backfill did not complete for all eligible rows.

## Verification

After migration, run:

```bash
psql $DATABASE_URL -f scripts/check-workspace-migration.sql
```

The script asserts:

- Workspace schema tables and constraints exist
- Domain tables (`categories`, `goals`, `user_preferences`) have no unexpected `workspace_id IS NULL` rows (rows with valid `user_id` must have `workspace_id` set)

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Migration fails: "duplicate key value violates unique constraint idx_goals_workspace_name_unique" | Pre-existing duplicate goal names per user | The migration deduplicates goals before backfill (renames duplicates to "Name (2)", "Name (3)"). If you hit this on a re-run, run the deduplication UPDATE from Step 4 of the migration manually. |
| "user_id required" from get_default_workspace_id_for_user | Called in migration context without p_user_id, or RPC without JWT | Migration backfill passes `p_user_id`; RPC must have valid JWT (authenticated session). |
| RLS denies access to rows with workspace_id IS NULL | Policy requires workspace membership or user_id match | Ensure backfill completed (Step 5b assertion). For inserts, the trigger sets workspace_id when NULL. |
