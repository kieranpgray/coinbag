-- Check: Workspace schema migration verification
-- Run with: psql $DATABASE_URL -f scripts/check-workspace-migration.sql
-- Or via Supabase SQL Editor

-- 1. Tables exist (public schema)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces') THEN
    RAISE EXCEPTION 'FAIL: workspaces table does not exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_memberships') THEN
    RAISE EXCEPTION 'FAIL: workspace_memberships table does not exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_invitations') THEN
    RAISE EXCEPTION 'FAIL: workspace_invitations table does not exist';
  END IF;
  RAISE NOTICE 'PASS: All workspace tables exist';
END $$;

-- 2. workspace_role enum exists (public schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'workspace_role' AND n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'FAIL: workspace_role enum does not exist';
  END IF;
  RAISE NOTICE 'PASS: workspace_role enum exists';
END $$;

-- 3. Unique constraints (membership: one per user per workspace; invite: one pending per email per workspace; token unique)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'workspace_memberships' AND c.contype = 'u'
    AND array_length(c.conkey, 1) = 2
    AND (
      SELECT array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum))::text[]
      FROM pg_attribute a
      WHERE a.attrelid = t.oid AND a.attnum = ANY(c.conkey) AND NOT a.attisdropped
    ) = ARRAY['workspace_id', 'user_id']
  ) THEN
    RAISE EXCEPTION 'FAIL: workspace_memberships unique (workspace_id, user_id) missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_workspace_invitations_pending_unique'
  ) THEN
    RAISE EXCEPTION 'FAIL: workspace_invitations partial unique (workspace_id, email) WHERE accepted_at IS NULL missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey) AND NOT a.attisdropped
    WHERE n.nspname = 'public' AND t.relname = 'workspace_invitations' AND c.contype = 'u' AND a.attname = 'token'
  ) THEN
    RAISE EXCEPTION 'FAIL: workspace_invitations unique constraint on token missing';
  END IF;
  RAISE NOTICE 'PASS: Unique constraints present';
END $$;

-- 4. Required indexes exist
DO $$
DECLARE
  idx text;
  required_indexes text[] := ARRAY[
    'idx_workspaces_created_by',
    'idx_workspace_memberships_user_id',
    'idx_workspace_memberships_workspace_id',
    'idx_workspace_memberships_user_workspace',
    'idx_workspace_invitations_workspace_id',
    'idx_workspace_invitations_token',
    'idx_workspace_invitations_email',
    'idx_workspace_invitations_expires_at'
  ];
BEGIN
  FOREACH idx IN ARRAY required_indexes
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = idx) THEN
      RAISE EXCEPTION 'FAIL: Index % does not exist', idx;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS: All required indexes exist';
END $$;

-- 5. RLS enabled (public schema)
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'workspaces') THEN
    RAISE EXCEPTION 'FAIL: RLS not enabled on workspaces';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'workspace_memberships') THEN
    RAISE EXCEPTION 'FAIL: RLS not enabled on workspace_memberships';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'workspace_invitations') THEN
    RAISE EXCEPTION 'FAIL: RLS not enabled on workspace_invitations';
  END IF;
  RAISE NOTICE 'PASS: RLS enabled on all workspace tables';
END $$;

-- 6. Creator-as-admin trigger exists (public schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger tr
    JOIN pg_class c ON c.oid = tr.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND tr.tgname = 'trigger_workspace_add_creator_as_admin'
  ) THEN
    RAISE EXCEPTION 'FAIL: create_workspace_add_creator_as_admin trigger missing';
  END IF;
  RAISE NOTICE 'PASS: Creator-as-admin trigger exists';
END $$;

-- 7. Domain tables: no unexpected workspace_id IS NULL after migration
-- Rows with valid user_id (non-null, non-empty) must have workspace_id set
-- Only runs when domain migration has been applied (workspace_id column exists)
DO $$
DECLARE
  v_has_workspace_id boolean;
  v_categories_null bigint;
  v_goals_null bigint;
  v_prefs_null bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'workspace_id'
  ) INTO v_has_workspace_id;
  IF NOT v_has_workspace_id THEN
    RAISE NOTICE 'SKIP: Domain migration not applied (workspace_id missing on categories)';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_categories_null FROM categories
    WHERE user_id IS NOT NULL AND user_id <> '' AND workspace_id IS NULL;
  SELECT COUNT(*) INTO v_goals_null FROM goals
    WHERE user_id IS NOT NULL AND user_id <> '' AND workspace_id IS NULL;
  SELECT COUNT(*) INTO v_prefs_null FROM user_preferences
    WHERE user_id IS NOT NULL AND user_id <> '' AND workspace_id IS NULL;

  IF v_categories_null > 0 OR v_goals_null > 0 OR v_prefs_null > 0 THEN
    RAISE EXCEPTION 'FAIL: Domain tables have unexpected workspace_id IS NULL: categories=%, goals=%, user_preferences=%',
      v_categories_null, v_goals_null, v_prefs_null;
  END IF;
  RAISE NOTICE 'PASS: Domain tables have no unexpected workspace_id IS NULL rows';
END $$;

-- 8. Goals workspace-scoped unique index (partial: workspace_id IS NOT NULL)
-- Only runs when domain migration has been applied
DO $$
DECLARE
  v_has_workspace_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'workspace_id'
  ) INTO v_has_workspace_id;
  IF NOT v_has_workspace_id THEN
    RAISE NOTICE 'SKIP: Domain migration not applied (workspace_id missing on goals)';
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_goals_workspace_name_unique'
  ) THEN
    RAISE EXCEPTION 'FAIL: idx_goals_workspace_name_unique partial unique index missing';
  END IF;
  RAISE NOTICE 'PASS: Goals workspace-scoped unique index exists';
END $$;

SELECT 'Workspace migration checks complete' AS status;
