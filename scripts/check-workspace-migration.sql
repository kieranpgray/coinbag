-- Check: Workspace schema migration verification
-- Run with: psql $DATABASE_URL -f scripts/check-workspace-migration.sql
-- Or via Supabase SQL Editor

-- 1. Tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspaces') THEN
    RAISE EXCEPTION 'FAIL: workspaces table does not exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_memberships') THEN
    RAISE EXCEPTION 'FAIL: workspace_memberships table does not exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_invitations') THEN
    RAISE EXCEPTION 'FAIL: workspace_invitations table does not exist';
  END IF;
  RAISE NOTICE 'PASS: All workspace tables exist';
END $$;

-- 2. workspace_role enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_role') THEN
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
    WHERE t.relname = 'workspace_memberships' AND c.contype = 'u'
  ) THEN
    RAISE EXCEPTION 'FAIL: workspace_memberships unique (workspace_id, user_id) missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_workspace_invitations_pending_unique'
  ) THEN
    RAISE EXCEPTION 'FAIL: workspace_invitations partial unique (workspace_id, email) WHERE accepted_at IS NULL missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey) AND NOT a.attisdropped
    WHERE t.relname = 'workspace_invitations' AND c.contype = 'u' AND a.attname = 'token'
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
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = idx) THEN
      RAISE EXCEPTION 'FAIL: Index % does not exist', idx;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS: All required indexes exist';
END $$;

-- 5. RLS enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'workspaces') THEN
    RAISE EXCEPTION 'FAIL: RLS not enabled on workspaces';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'workspace_memberships') THEN
    RAISE EXCEPTION 'FAIL: RLS not enabled on workspace_memberships';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'workspace_invitations') THEN
    RAISE EXCEPTION 'FAIL: RLS not enabled on workspace_invitations';
  END IF;
  RAISE NOTICE 'PASS: RLS enabled on all workspace tables';
END $$;

-- 6. Creator-as-admin trigger exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_workspace_add_creator_as_admin') THEN
    RAISE EXCEPTION 'FAIL: create_workspace_add_creator_as_admin trigger missing';
  END IF;
  RAISE NOTICE 'PASS: Creator-as-admin trigger exists';
END $$;

SELECT 'Workspace migration checks complete' AS status;
