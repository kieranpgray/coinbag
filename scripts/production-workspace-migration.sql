-- Production Workspace Migration
-- Apply to: https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx/sql/new
-- This combines all workspace migrations needed to fix the top nav bar error

-- ============================================================================
-- Migration 1: Create workspaces schema
-- ============================================================================
-- Migration: Create workspaces, workspace_memberships, workspace_invitations
-- Description: Schema foundations for multi-user workspace collaboration
-- Prerequisites: pgcrypto extension, auth.jwt() for Clerk JWT sub
-- Dependencies: update_updated_at_column() (from earlier migrations, e.g. 20251227120113)
-- Rollback: Drop tables in reverse dependency order

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create workspace_role enum for membership roles
DO $$ BEGIN
  CREATE TYPE workspace_role AS ENUM ('admin', 'edit', 'read');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_by text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE workspaces IS 'Tenant container for collaborative financial data; distinct from financial accounts';
COMMENT ON COLUMN workspaces.id IS 'Primary key - UUID';
COMMENT ON COLUMN workspaces.name IS 'Display name of the workspace';
COMMENT ON COLUMN workspaces.created_by IS 'Clerk user ID (JWT sub) of creator';
COMMENT ON COLUMN workspaces.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN workspaces.updated_at IS 'Last update timestamp';

CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);

-- Create workspace_memberships table
CREATE TABLE IF NOT EXISTS workspace_memberships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role workspace_role NOT NULL DEFAULT 'edit',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (workspace_id, user_id)
);

COMMENT ON TABLE workspace_memberships IS 'User membership in a workspace with role-based permissions';
COMMENT ON COLUMN workspace_memberships.workspace_id IS 'FK to workspaces';
COMMENT ON COLUMN workspace_memberships.user_id IS 'Clerk user ID (JWT sub)';
COMMENT ON COLUMN workspace_memberships.role IS 'admin|edit|read';

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user_id ON workspace_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_memberships_workspace_id ON workspace_memberships(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user_workspace ON workspace_memberships(user_id, workspace_id);

-- Create workspace_invitations table
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role workspace_role NOT NULL DEFAULT 'edit',
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  invited_by text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE workspace_invitations IS 'Email-based invites with single-use token and 7-day expiry';
COMMENT ON COLUMN workspace_invitations.token IS 'Cryptographically strong single-use token';
COMMENT ON COLUMN workspace_invitations.accepted_at IS 'NULL until accepted; set on acceptance';
COMMENT ON COLUMN workspace_invitations.invited_by IS 'Clerk user ID of inviter';

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_expires_at ON workspace_invitations(expires_at);

-- Partial unique: only one pending invite per (workspace_id, email) at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_invitations_pending_unique
  ON workspace_invitations(workspace_id, email)
  WHERE accepted_at IS NULL;

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS: workspaces - creator can manage their own workspaces (drop first for idempotency)
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
CREATE POLICY "Users can view workspaces they belong to" ON workspaces
  FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (auth.jwt() ->> 'sub')
    )
    OR created_by = (auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = created_by);

DROP POLICY IF EXISTS "Workspace admins can update workspaces" ON workspaces;
CREATE POLICY "Workspace admins can update workspaces" ON workspaces
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_memberships
      WHERE workspace_id = workspaces.id
        AND user_id = (auth.jwt() ->> 'sub')
        AND role = 'admin'
    )
  )
  WITH CHECK (created_by = (SELECT w.created_by FROM workspaces w WHERE w.id = workspaces.id LIMIT 1));

DROP POLICY IF EXISTS "Workspace admins can delete workspaces" ON workspaces;
CREATE POLICY "Workspace admins can delete workspaces" ON workspaces
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_memberships
      WHERE workspace_id = workspaces.id
        AND user_id = (auth.jwt() ->> 'sub')
        AND role = 'admin'
    )
  );

-- RLS: workspace_memberships - members can view; admins can manage (drop first for idempotency)
DROP POLICY IF EXISTS "Members can view workspace memberships" ON workspace_memberships;
CREATE POLICY "Members can view workspace memberships" ON workspace_memberships
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships wm2
      WHERE wm2.user_id = (auth.jwt() ->> 'sub')
    )
  );

DROP POLICY IF EXISTS "Admins can insert memberships" ON workspace_memberships;
CREATE POLICY "Admins can insert memberships" ON workspace_memberships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_memberships wm2
      WHERE wm2.workspace_id = workspace_id
        AND wm2.user_id = (auth.jwt() ->> 'sub')
        AND wm2.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update memberships" ON workspace_memberships;
CREATE POLICY "Admins can update memberships" ON workspace_memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_memberships wm2
      WHERE wm2.workspace_id = workspace_memberships.workspace_id
        AND wm2.user_id = (auth.jwt() ->> 'sub')
        AND wm2.role = 'admin'
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete memberships" ON workspace_memberships;
CREATE POLICY "Admins can delete memberships" ON workspace_memberships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_memberships wm2
      WHERE wm2.workspace_id = workspace_memberships.workspace_id
        AND wm2.user_id = (auth.jwt() ->> 'sub')
        AND wm2.role = 'admin'
    )
  );

-- RLS: workspace_invitations - members can view; admins can manage (drop first for idempotency)
DROP POLICY IF EXISTS "Members can view workspace invitations" ON workspace_invitations;
CREATE POLICY "Members can view workspace invitations" ON workspace_invitations
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (auth.jwt() ->> 'sub')
    )
  );

DROP POLICY IF EXISTS "Admins can create invitations" ON workspace_invitations;
CREATE POLICY "Admins can create invitations" ON workspace_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_memberships
      WHERE workspace_id = workspace_invitations.workspace_id
        AND user_id = (auth.jwt() ->> 'sub')
        AND role = 'admin'
    )
    AND invited_by = (auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "Admins can update invitations" ON workspace_invitations;
CREATE POLICY "Admins can update invitations" ON workspace_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_memberships
      WHERE workspace_id = workspace_invitations.workspace_id
        AND user_id = (auth.jwt() ->> 'sub')
        AND role = 'admin'
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete invitations" ON workspace_invitations;
CREATE POLICY "Admins can delete invitations" ON workspace_invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_memberships
      WHERE workspace_id = workspace_invitations.workspace_id
        AND user_id = (auth.jwt() ->> 'sub')
        AND role = 'admin'
    )
  );

-- Trigger: auto-add creator as admin when workspace is created
CREATE OR REPLACE FUNCTION create_workspace_add_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO workspace_memberships (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_workspace_add_creator_as_admin ON workspaces;
CREATE TRIGGER trigger_workspace_add_creator_as_admin
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION create_workspace_add_creator_as_admin();

-- Trigger: updated_at on workspaces
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: updated_at on workspace_memberships
DROP TRIGGER IF EXISTS update_workspace_memberships_updated_at ON workspace_memberships;
CREATE TRIGGER update_workspace_memberships_updated_at
  BEFORE UPDATE ON workspace_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: updated_at on workspace_invitations
DROP TRIGGER IF EXISTS update_workspace_invitations_updated_at ON workspace_invitations;
CREATE TRIGGER update_workspace_invitations_updated_at
  BEFORE UPDATE ON workspace_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration 2: Workspace context for domain tables
-- ============================================================================
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

DROP TRIGGER IF EXISTS trigger_categories_set_workspace_id ON categories;
CREATE TRIGGER trigger_categories_set_workspace_id
  BEFORE INSERT ON categories
  FOR EACH ROW
  EXECUTE FUNCTION set_workspace_id_on_insert();

DROP TRIGGER IF EXISTS trigger_goals_set_workspace_id ON goals;
CREATE TRIGGER trigger_goals_set_workspace_id
  BEFORE INSERT ON goals
  FOR EACH ROW
  EXECUTE FUNCTION set_workspace_id_on_insert();

DROP TRIGGER IF EXISTS trigger_user_preferences_set_workspace_id ON user_preferences;
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

-- ============================================================================
-- Migration 3: Workspace invite accept function
-- ============================================================================
-- Migration: Create function to accept workspace invitations
-- Description: Creates a secure RPC function for accepting workspace invitations using tokens
-- Prerequisites: workspace_invitations table exists
-- Rollback: DROP FUNCTION accept_workspace_invitation(text);

CREATE OR REPLACE FUNCTION accept_workspace_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_workspace_id uuid;
  v_user_id text;
  v_result jsonb;
BEGIN
  -- Validate input
  IF p_token IS NULL OR p_token = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token is required');
  END IF;

  -- Get current user from JWT
  v_user_id := auth.jwt() ->> 'sub';
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Find and validate invitation
  SELECT * INTO v_invitation
  FROM workspace_invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM workspace_memberships
    WHERE workspace_id = v_invitation.workspace_id
      AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a member of this workspace');
  END IF;

  -- Accept invitation and add membership
  UPDATE workspace_invitations
  SET accepted_at = now()
  WHERE id = v_invitation.id;

  INSERT INTO workspace_memberships (workspace_id, user_id, role)
  VALUES (v_invitation.workspace_id, v_user_id, v_invitation.role);

  -- Get workspace details
  SELECT id INTO v_workspace_id FROM workspaces WHERE id = v_invitation.workspace_id;

  RETURN jsonb_build_object(
    'success', true,
    'workspace_id', v_workspace_id,
    'role', v_invitation.role
  );
END;
$$;

COMMENT ON FUNCTION accept_workspace_invitation(text) IS 'Accepts a workspace invitation using a token. Returns workspace details on success.';

GRANT EXECUTE ON FUNCTION accept_workspace_invitation(text) TO authenticated;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this separately to verify the migrations worked:

-- SELECT 'workspaces' as table_name, COUNT(*) as count FROM workspaces
-- UNION ALL
-- SELECT 'workspace_memberships', COUNT(*) FROM workspace_memberships
-- UNION ALL
-- SELECT 'workspace_invitations', COUNT(*) FROM workspace_invitations
-- UNION ALL
-- SELECT 'get_default_workspace_id_for_user function', COUNT(*) FROM information_schema.routines WHERE routine_name = 'get_default_workspace_id_for_user'
-- UNION ALL
-- SELECT 'accept_workspace_invitation function', COUNT(*) FROM information_schema.routines WHERE routine_name = 'accept_workspace_invitation';