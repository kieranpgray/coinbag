-- Migration: Workspace context rollout for domain tables (categories, goals, user_preferences)
-- Description: Adds nullable workspace_id, backfills ownership, updates RLS to membership-based with user fallback
-- Prerequisites: 20260226000000_create_workspaces_schema.sql
-- Rollback: Drop new columns, policies, function; restore original RLS

-- Step 1: Create get_default_workspace_id_for_user function
-- Returns the user's default workspace (first membership by created_at), or creates one if none exists
-- When called via RPC with no args: uses auth.jwt()->>'sub'
-- When called from migration with p_user_id: uses p_user_id (no JWT in migration context)
CREATE OR REPLACE FUNCTION get_default_workspace_id_for_user(p_user_id text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text;
  v_workspace_id uuid;
BEGIN
  -- Use JWT sub when available (client RPC); otherwise use p_user_id (migration backfill)
  v_user_id := COALESCE(auth.jwt() ->> 'sub', p_user_id);
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RAISE EXCEPTION 'user_id required: pass p_user_id in migration context, or ensure JWT is present for RPC';
  END IF;
  -- Security: when JWT exists, caller cannot request workspace for another user
  IF p_user_id IS NOT NULL AND (auth.jwt() ->> 'sub') IS NOT NULL AND (auth.jwt() ->> 'sub') <> p_user_id THEN
    RAISE EXCEPTION 'Cannot request workspace for another user';
  END IF;

  -- Try to get existing workspace membership
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_memberships
  WHERE user_id = v_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  -- If no membership, create a default workspace and add user as admin
  IF v_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, created_by)
    VALUES ('My Workspace', v_user_id)
    RETURNING id INTO v_workspace_id;
    -- Trigger auto-adds creator as admin via create_workspace_add_creator_as_admin
  END IF;

  RETURN v_workspace_id;
END;
$$;

COMMENT ON FUNCTION get_default_workspace_id_for_user(text) IS 'Returns default workspace ID for a user; creates one if none exists. RPC: call with {} to use JWT sub. Migration: pass p_user_id.';

GRANT EXECUTE ON FUNCTION get_default_workspace_id_for_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_default_workspace_id_for_user(text) TO service_role;

-- Step 2: Add nullable workspace_id to categories, goals, user_preferences
ALTER TABLE categories ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;

COMMENT ON COLUMN categories.workspace_id IS 'Workspace scope; NULL during migration, backfilled for existing rows';
COMMENT ON COLUMN goals.workspace_id IS 'Workspace scope; NULL during migration, backfilled for existing rows';
COMMENT ON COLUMN user_preferences.workspace_id IS 'Workspace scope; NULL during migration, backfilled for existing rows';

-- Step 3: Add indexes on workspace_id
CREATE INDEX IF NOT EXISTS idx_categories_workspace_id ON categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_goals_workspace_id ON goals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_workspace_id ON user_preferences(workspace_id);

-- Step 4: Deduplicate goals before backfill
-- For each (user_id, name) with multiple goals, rename duplicates to "Name (2)", "Name (3)" etc.
-- This prevents idx_goals_workspace_name_unique from failing when backfill assigns same workspace_id
UPDATE goals g
SET name = g.name || ' (' || sub.rn || ')'
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, name ORDER BY id) AS rn
  FROM goals
  WHERE user_id IS NOT NULL AND user_id <> ''
) sub
WHERE g.id = sub.id AND sub.rn > 1;

-- Step 5: Backfill workspace ownership
-- For each user with data in categories, goals, or user_preferences:
-- 1. Get or create their default workspace
-- 2. Update rows to set workspace_id
DO $$
DECLARE
  r RECORD;
  v_workspace_id uuid;
BEGIN
  FOR r IN (
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM categories
      UNION
      SELECT user_id FROM goals
      UNION
      SELECT user_id FROM user_preferences
    ) u
    WHERE user_id IS NOT NULL AND user_id <> ''
  )
  LOOP
    v_workspace_id := get_default_workspace_id_for_user(r.user_id);

    UPDATE categories SET workspace_id = v_workspace_id WHERE user_id = r.user_id AND workspace_id IS NULL;
    UPDATE goals SET workspace_id = v_workspace_id WHERE user_id = r.user_id AND workspace_id IS NULL;
    UPDATE user_preferences SET workspace_id = v_workspace_id WHERE user_id = r.user_id AND workspace_id IS NULL;
  END LOOP;
END;
$$;

-- Step 5a: Add workspace-scoped unique constraint on goals (after backfill and deduplication)
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_workspace_name_unique
  ON goals(workspace_id, name)
  WHERE workspace_id IS NOT NULL;

-- Step 5b: Post-backfill assertion - fail if any rows were not backfilled
DO $$
DECLARE
  v_categories_null bigint;
  v_goals_null bigint;
  v_prefs_null bigint;
BEGIN
  SELECT COUNT(*) INTO v_categories_null FROM categories
    WHERE user_id IS NOT NULL AND user_id <> '' AND workspace_id IS NULL;
  SELECT COUNT(*) INTO v_goals_null FROM goals
    WHERE user_id IS NOT NULL AND user_id <> '' AND workspace_id IS NULL;
  SELECT COUNT(*) INTO v_prefs_null FROM user_preferences
    WHERE user_id IS NOT NULL AND user_id <> '' AND workspace_id IS NULL;

  IF v_categories_null > 0 OR v_goals_null > 0 OR v_prefs_null > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % categories, % goals, % user_preferences rows still have workspace_id IS NULL',
      v_categories_null, v_goals_null, v_prefs_null;
  END IF;
END;
$$;

-- Step 5c: Trigger to set workspace_id from default when NULL on insert
-- Ensures new rows get workspace_id even when client omits it (transition period)
CREATE OR REPLACE FUNCTION set_workspace_id_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.user_id IS NOT NULL AND NEW.user_id <> '' THEN
    NEW.workspace_id := get_default_workspace_id_for_user(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_categories_set_workspace_id
  BEFORE INSERT ON categories
  FOR EACH ROW
  EXECUTE FUNCTION set_workspace_id_on_insert();

CREATE TRIGGER trigger_goals_set_workspace_id
  BEFORE INSERT ON goals
  FOR EACH ROW
  EXECUTE FUNCTION set_workspace_id_on_insert();

CREATE TRIGGER trigger_user_preferences_set_workspace_id
  BEFORE INSERT ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION set_workspace_id_on_insert();

-- Step 6: Update RLS policies - membership-based with user-scoped fallback
-- categories
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT
  USING (
    (workspace_id IS NOT NULL AND workspace_id IN (
      SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub')
    ))
    OR (workspace_id IS NULL AND (auth.jwt() ->> 'sub') = user_id)
  );

DROP POLICY IF EXISTS "Users can create their own categories" ON categories;
CREATE POLICY "Users can create their own categories" ON categories
  FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'sub') = user_id
    AND (
      workspace_id IS NULL
      OR workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub'))
    )
  );

DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE
  USING (
    (workspace_id IS NOT NULL AND workspace_id IN (
      SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub')
    ))
    OR (workspace_id IS NULL AND (auth.jwt() ->> 'sub') = user_id)
  )
  WITH CHECK (
    (auth.jwt() ->> 'sub') = user_id
    AND (
      workspace_id IS NULL
      OR workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub'))
    )
  );

DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;
CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE
  USING (
    (workspace_id IS NOT NULL AND workspace_id IN (
      SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub')
    ))
    OR (workspace_id IS NULL AND (auth.jwt() ->> 'sub') = user_id)
  );

-- goals
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
CREATE POLICY "Users can view their own goals" ON goals
  FOR SELECT
  USING (
    (workspace_id IS NOT NULL AND workspace_id IN (
      SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub')
    ))
    OR (workspace_id IS NULL AND (auth.jwt() ->> 'sub') = user_id)
  );

DROP POLICY IF EXISTS "Users can create their own goals" ON goals;
CREATE POLICY "Users can create their own goals" ON goals
  FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'sub') = user_id
    AND (
      workspace_id IS NULL
      OR workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub'))
    )
  );

DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
CREATE POLICY "Users can update their own goals" ON goals
  FOR UPDATE
  USING (
    (workspace_id IS NOT NULL AND workspace_id IN (
      SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub')
    ))
    OR (workspace_id IS NULL AND (auth.jwt() ->> 'sub') = user_id)
  )
  WITH CHECK (
    (auth.jwt() ->> 'sub') = user_id
    AND (
      workspace_id IS NULL
      OR workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub'))
    )
  );

DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;
CREATE POLICY "Users can delete their own goals" ON goals
  FOR DELETE
  USING (
    (workspace_id IS NOT NULL AND workspace_id IN (
      SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub')
    ))
    OR (workspace_id IS NULL AND (auth.jwt() ->> 'sub') = user_id)
  );

-- user_preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT
  USING (
    (workspace_id IS NOT NULL AND workspace_id IN (
      SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub')
    ))
    OR (workspace_id IS NULL AND (auth.jwt() ->> 'sub') = user_id)
  );

DROP POLICY IF EXISTS "Users can create their own preferences" ON user_preferences;
CREATE POLICY "Users can create their own preferences" ON user_preferences
  FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'sub') = user_id
    AND (
      workspace_id IS NULL
      OR workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub'))
    )
  );

DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE
  USING (
    (workspace_id IS NOT NULL AND workspace_id IN (
      SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub')
    ))
    OR (workspace_id IS NULL AND (auth.jwt() ->> 'sub') = user_id)
  )
  WITH CHECK (
    (auth.jwt() ->> 'sub') = user_id
    AND (
      workspace_id IS NULL
      OR workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub'))
    )
  );

DROP POLICY IF EXISTS "Users can delete their own preferences" ON user_preferences;
CREATE POLICY "Users can delete their own preferences" ON user_preferences
  FOR DELETE
  USING (
    (workspace_id IS NOT NULL AND workspace_id IN (
      SELECT workspace_id FROM workspace_memberships WHERE user_id = (auth.jwt() ->> 'sub')
    ))
    OR (workspace_id IS NULL AND (auth.jwt() ->> 'sub') = user_id)
  );
