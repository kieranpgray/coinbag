-- Migration: Fix infinite recursion in workspace_memberships RLS (42P17)
-- Description: Policies on workspace_memberships referenced the same table, causing recursion.
--              Add SECURITY DEFINER helpers that read workspace_memberships without re-entering RLS,
--              and use them in all four membership policies. Harden get_default_workspace_id_for_user.
-- Prerequisites: 20260226000000_create_workspaces_schema.sql, 20260226120000_workspace_context_domain_tables.sql
-- Rollback: Drop new policies, recreate originals from 20260226000000; drop helpers; restore get_default_workspace_id_for_user.
--
-- If 42P17 still occurs after deploy: the function owner may not bypass RLS. Try adding at the start
-- of each helper body: EXECUTE 'SET LOCAL ROLE postgres' (or the role that owns workspace_memberships
-- and has BYPASSRLS), then SET ROLE back to current_user before returning. In Supabase the table
-- owner is typically the migration runner (e.g. postgres).

-- Step 1: Helper – workspace IDs the current user is a member of (avoids RLS self-reference)
CREATE OR REPLACE FUNCTION get_workspace_ids_for_current_user()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT workspace_id
  FROM workspace_memberships
  WHERE user_id = auth.jwt() ->> 'sub';
$$;

COMMENT ON FUNCTION get_workspace_ids_for_current_user() IS 'Returns workspace IDs for the current JWT user. Exists to avoid RLS recursion on workspace_memberships.';

GRANT EXECUTE ON FUNCTION get_workspace_ids_for_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_ids_for_current_user() TO service_role;

-- Step 2: Helper – whether current user is admin in the given workspace (avoids RLS self-reference)
CREATE OR REPLACE FUNCTION is_admin_in_workspace(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_memberships
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.jwt() ->> 'sub'
      AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION is_admin_in_workspace(uuid) IS 'Returns true if the current JWT user is an admin in the given workspace. Exists to avoid RLS recursion on workspace_memberships.';

GRANT EXECUTE ON FUNCTION is_admin_in_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_in_workspace(uuid) TO service_role;

-- Helper for get_default_workspace_id_for_user (RPC path): first workspace by created_at, no RLS re-entry
CREATE OR REPLACE FUNCTION get_first_workspace_id_for_current_user()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT workspace_id
  FROM workspace_memberships
  WHERE user_id = auth.jwt() ->> 'sub'
  ORDER BY created_at ASC
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_first_workspace_id_for_current_user() IS 'Returns the first workspace ID (by created_at) for the current JWT user. Used by get_default_workspace_id_for_user to avoid RLS recursion.';

GRANT EXECUTE ON FUNCTION get_first_workspace_id_for_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION get_first_workspace_id_for_current_user() TO service_role;

-- Step 3: Replace workspace_memberships policies (use helpers instead of self-referential subqueries)
DROP POLICY IF EXISTS "Members can view workspace memberships" ON workspace_memberships;
DROP POLICY IF EXISTS "Admins can insert memberships" ON workspace_memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON workspace_memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON workspace_memberships;

CREATE POLICY "Members can view workspace memberships" ON workspace_memberships
  FOR SELECT
  USING (workspace_id IN (SELECT get_workspace_ids_for_current_user()));

CREATE POLICY "Admins can insert memberships" ON workspace_memberships
  FOR INSERT
  WITH CHECK (is_admin_in_workspace(workspace_id));

CREATE POLICY "Admins can update memberships" ON workspace_memberships
  FOR UPDATE
  USING (is_admin_in_workspace(workspace_memberships.workspace_id))
  WITH CHECK (true);

CREATE POLICY "Admins can delete memberships" ON workspace_memberships
  FOR DELETE
  USING (is_admin_in_workspace(workspace_memberships.workspace_id));

-- workspace_invitations policies are unchanged; their subquery to workspace_memberships will
-- succeed once workspace_memberships policies use the helpers (no recursion).

-- Step 4: Harden get_default_workspace_id_for_user – use helper when JWT present (RPC path)
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
  v_user_id := COALESCE(auth.jwt() ->> 'sub', p_user_id);
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RAISE EXCEPTION 'user_id required: pass p_user_id in migration context, or ensure JWT is present for RPC';
  END IF;
  IF p_user_id IS NOT NULL AND (auth.jwt() ->> 'sub') IS NOT NULL AND (auth.jwt() ->> 'sub') <> p_user_id THEN
    RAISE EXCEPTION 'Cannot request workspace for another user';
  END IF;

  -- When JWT is present (client RPC): use helper to avoid RLS recursion on workspace_memberships
  IF (auth.jwt() ->> 'sub') IS NOT NULL THEN
    v_workspace_id := get_first_workspace_id_for_current_user();
  ELSE
    -- Migration context: no JWT; direct read (migration runner typically bypasses RLS)
    SELECT workspace_id INTO v_workspace_id
    FROM workspace_memberships
    WHERE user_id = v_user_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, created_by)
    VALUES ('My Workspace', v_user_id)
    RETURNING id INTO v_workspace_id;
  END IF;

  RETURN v_workspace_id;
END;
$$;

COMMENT ON FUNCTION get_default_workspace_id_for_user(text) IS 'Returns default workspace ID for a user; creates one if none exists. RPC: call with {} to use JWT sub. Migration: pass p_user_id.';
