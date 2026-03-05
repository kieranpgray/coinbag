-- Combined Schema Migration: Account Updates + Workspace Support
-- Description: Applies all necessary schema changes for account fixes and workspace functionality
-- Date: March 5, 2026
-- Safe to run multiple times (idempotent)

-- ============================================================================
-- PHASE 1: ACCOUNT SCHEMA UPDATES (December 31, 2025)
-- ============================================================================

-- 1. Add credit fields to accounts table
-- Migration: 20251231000001_add_credit_fields_to_accounts.sql

-- Add credit_limit column (for credit cards/loans)
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS credit_limit numeric(10,2) CHECK (credit_limit >= 0);

-- Add balance_owed column (for credit cards/loans - always positive)
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS balance_owed numeric(10,2) CHECK (balance_owed >= 0);

-- Add column comments
COMMENT ON COLUMN accounts.credit_limit IS 'Credit limit for credit cards/loans (original loan amount)';
COMMENT ON COLUMN accounts.balance_owed IS 'Balance owed for credit cards/loans (positive number)';

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_accounts_credit_limit ON accounts(credit_limit) WHERE credit_limit IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_balance_owed ON accounts(balance_owed) WHERE balance_owed IS NOT NULL;

-- 2. Update account types constraint
-- Migration: 20251231000002_update_account_types.sql

-- Drop existing constraint
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;

-- Update existing 'Checking' records to 'Bank Account' (if any exist)
UPDATE accounts
SET account_type = 'Bank Account'
WHERE account_type = 'Checking';

-- Update existing 'Investment' records to 'Other' (if any exist)
UPDATE accounts
SET account_type = 'Other'
WHERE account_type = 'Investment';

-- Update existing 'Crypto' records to 'Other' (if any exist)
UPDATE accounts
SET account_type = 'Other'
WHERE account_type = 'Crypto';

-- Add updated CHECK constraint for valid account types
ALTER TABLE accounts
ADD CONSTRAINT accounts_account_type_check
CHECK (account_type IN (
  'Bank Account',
  'Savings',
  'Credit Card',
  'Loan',
  'Other'
));

-- Add comment
COMMENT ON CONSTRAINT accounts_account_type_check ON accounts IS 'Validates account type matches updated PRD values';

-- 3. Add account linking to goals
-- Migration: 20251231000003_add_account_linking_to_goals.sql

-- Add account_id column with foreign key constraint
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS account_id uuid;

-- Add foreign key constraint with ON DELETE SET NULL (auto-unlink on account deletion)
ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_account_id_fkey;

ALTER TABLE goals
ADD CONSTRAINT goals_account_id_fkey
FOREIGN KEY (account_id)
REFERENCES accounts(id)
ON DELETE SET NULL;

-- Add index on account_id for performance
CREATE INDEX IF NOT EXISTS idx_goals_account_id ON goals(account_id);

-- Add column comment
COMMENT ON COLUMN goals.account_id IS 'Linked account ID - when set, goal syncs bidirectionally with account balance';

-- Remove type column and its constraint
-- First drop the CHECK constraint
ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_type_check;

-- Drop the index on type if it exists
DROP INDEX IF EXISTS idx_goals_type;

-- Remove the type column
ALTER TABLE goals
DROP COLUMN IF EXISTS type;

-- Create trigger function to sync goal from account (Account → Goal)
CREATE OR REPLACE FUNCTION sync_goal_from_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Update linked goals when account balance or balance_owed changes
  -- Only update if the value actually changed to prevent infinite loops
  IF (TG_OP = 'UPDATE' AND (OLD.balance IS DISTINCT FROM NEW.balance OR OLD.balance_owed IS DISTINCT FROM NEW.balance_owed)) THEN
    -- For credit cards and loans, use balance_owed if available, otherwise use balance
    -- For other accounts, use balance
    UPDATE goals
    SET current_amount = CASE
      WHEN NEW.account_type IN ('Credit Card', 'Loan') AND NEW.balance_owed IS NOT NULL
      THEN NEW.balance_owed
      ELSE NEW.balance
    END,
    updated_at = now()
    WHERE account_id = NEW.id
    AND user_id = NEW.user_id; -- Ensure same user for security
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on accounts table
DROP TRIGGER IF EXISTS trigger_sync_goal_from_account ON accounts;
CREATE TRIGGER trigger_sync_goal_from_account
  AFTER UPDATE OF balance, balance_owed ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION sync_goal_from_account();

-- Create trigger function to sync account from goal (Goal → Account)
CREATE OR REPLACE FUNCTION sync_account_from_goal()
RETURNS TRIGGER AS $$
DECLARE
  linked_account accounts%ROWTYPE;
BEGIN
  -- Only sync if account_id is set
  IF NEW.account_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only update if the value actually changed to prevent infinite loops
  IF (TG_OP = 'UPDATE' AND OLD.current_amount IS DISTINCT FROM NEW.current_amount) THEN
    -- Get the linked account
    SELECT * INTO linked_account
    FROM accounts
    WHERE id = NEW.account_id
    AND user_id = NEW.user_id; -- Ensure same user for security

    -- If account exists and belongs to same user, update it
    IF FOUND THEN
      -- For credit cards and loans, update balance_owed if available, otherwise balance
      -- For other accounts, update balance
      IF linked_account.account_type IN ('Credit Card', 'Loan') AND linked_account.balance_owed IS NOT NULL THEN
        UPDATE accounts
        SET balance_owed = NEW.current_amount,
            updated_at = now()
        WHERE id = NEW.account_id
        AND user_id = NEW.user_id;
      ELSE
        UPDATE accounts
        SET balance = NEW.current_amount,
            updated_at = now()
        WHERE id = NEW.account_id
        AND user_id = NEW.user_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on goals table
DROP TRIGGER IF EXISTS trigger_sync_account_from_goal ON goals;
CREATE TRIGGER trigger_sync_account_from_goal
  AFTER UPDATE OF current_amount ON goals
  FOR EACH ROW
  EXECUTE FUNCTION sync_account_from_goal();

-- Add comments
COMMENT ON FUNCTION sync_goal_from_account() IS 'Syncs goal current_amount from linked account balance when account updates';
COMMENT ON FUNCTION sync_account_from_goal() IS 'Syncs linked account balance from goal current_amount when goal updates';

-- 4. Remove available_balance and make institution optional
-- Migration: 20251231000004_remove_available_balance_and_make_institution_optional.sql

-- Update goals sync trigger to remove available_balance reference
-- (Function already updated above)

-- Make institution column nullable
ALTER TABLE accounts
ALTER COLUMN institution DROP NOT NULL;

-- Remove available_balance column
ALTER TABLE accounts
DROP COLUMN IF EXISTS available_balance;

-- Update column comment for institution
COMMENT ON COLUMN accounts.institution IS 'Bank or financial institution name (optional)';

-- 5. Add locale to user preferences
-- Migration: 20251231000005_add_locale_to_user_preferences.sql

-- Add locale column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'locale'
  ) THEN
    ALTER TABLE user_preferences
    ADD COLUMN locale text NOT NULL DEFAULT 'en-US';
  END IF;
END $$;

-- Add CHECK constraint for valid locale values
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_locale_check'
  ) THEN
    ALTER TABLE user_preferences DROP CONSTRAINT user_preferences_locale_check;
  END IF;

  -- Add new constraint
  ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_locale_check
  CHECK (locale IN ('en-US', 'en-AU'));
END $$;

-- Add comment
COMMENT ON COLUMN user_preferences.locale IS 'User locale preference (en-US, en-AU). Controls date formats, currency display, and text translations.';

-- Update existing rows to have default locale (if any exist without locale)
UPDATE user_preferences
SET locale = 'en-US'
WHERE locale IS NULL OR locale = '';

-- ============================================================================
-- PHASE 2: WORKSPACE SCHEMA (February-March 2026)
-- ============================================================================

-- 6. Create workspaces schema
-- Migration: 20260226000000_create_workspaces_schema.sql

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

-- RLS: workspaces - creator can manage their own workspaces
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

-- RLS: workspace_memberships - members can view; admins can manage
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

-- RLS: workspace_invitations - members can view; admins can manage
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

-- 7. Add workspace context to domain tables
-- Migration: 20260226120000_workspace_context_domain_tables.sql

-- Helper function to get default workspace for user
CREATE OR REPLACE FUNCTION get_default_workspace_id_for_user(p_user_id text DEFAULT NULL)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT workspace_id
  FROM workspace_memberships
  WHERE user_id = COALESCE(p_user_id, auth.jwt() ->> 'sub')
  ORDER BY created_at
  LIMIT 1;
$$;

-- Helper function to set workspace_id on insert
CREATE OR REPLACE FUNCTION set_workspace_id_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set workspace_id if it's NULL (respect explicit workspace assignment)
  IF NEW.workspace_id IS NULL THEN
    NEW.workspace_id := get_default_workspace_id_for_user(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Add workspace_id columns to domain tables
ALTER TABLE categories ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_workspace_id ON categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_goals_workspace_id ON goals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_workspace_id ON user_preferences(workspace_id);

-- Create triggers to auto-set workspace_id on insert
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

-- Enable RLS on domain tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

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

-- 8. Add workspace invite accept function
-- Migration: 20260226180000_workspace_invite_accept_function.sql

-- Function to accept workspace invitation
CREATE OR REPLACE FUNCTION accept_workspace_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record workspace_invitations%ROWTYPE;
  result jsonb;
BEGIN
  -- Get invitation by token, must be unexpired and not accepted
  SELECT * INTO invitation_record
  FROM workspace_invitations
  WHERE token = p_token
    AND expires_at > now()
    AND accepted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invitation token'
    );
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM workspace_memberships
    WHERE workspace_id = invitation_record.workspace_id
      AND user_id = (auth.jwt() ->> 'sub')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is already a member of this workspace'
    );
  END IF;

  -- Add user to workspace
  INSERT INTO workspace_memberships (workspace_id, user_id, role)
  VALUES (invitation_record.workspace_id, (auth.jwt() ->> 'sub'), invitation_record.role);

  -- Mark invitation as accepted
  UPDATE workspace_invitations
  SET accepted_at = now()
  WHERE id = invitation_record.id;

  -- Return success with workspace info
  SELECT jsonb_build_object(
    'success', true,
    'workspace_id', w.id,
    'workspace_name', w.name,
    'role', invitation_record.role
  ) INTO result
  FROM workspaces w
  WHERE w.id = invitation_record.workspace_id;

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION accept_workspace_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_workspace_invitation(text) TO service_role;

-- Add comment
COMMENT ON FUNCTION accept_workspace_invitation(text) IS 'Accepts a workspace invitation using a token. Adds the authenticated user to the workspace and marks the invitation as accepted.';

-- 9. Fix workspace memberships RLS recursion
-- Migration: 20260304120000_fix_workspace_memberships_rls_recursion.sql

-- Helper - workspace IDs the current user is a member of (avoids RLS self-reference)
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

-- Helper - whether current user is admin in the given workspace (avoids RLS self-reference)
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

-- Update existing policies to use helper functions
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
CREATE POLICY "Users can view workspaces they belong to" ON workspaces
  FOR SELECT
  USING (
    id IN (SELECT get_workspace_ids_for_current_user())
    OR created_by = (auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "Workspace admins can update workspaces" ON workspaces;
CREATE POLICY "Workspace admins can update workspaces" ON workspaces
  FOR UPDATE
  USING (is_admin_in_workspace(id))
  WITH CHECK (created_by = (SELECT w.created_by FROM workspaces w WHERE w.id = workspaces.id LIMIT 1));

DROP POLICY IF EXISTS "Workspace admins can delete workspaces" ON workspaces;
CREATE POLICY "Workspace admins can delete workspaces" ON workspaces
  FOR DELETE
  USING (is_admin_in_workspace(id));

-- Update membership policies
DROP POLICY IF EXISTS "Members can view workspace memberships" ON workspace_memberships;
CREATE POLICY "Members can view workspace memberships" ON workspace_memberships
  FOR SELECT
  USING (workspace_id IN (SELECT get_workspace_ids_for_current_user()));

DROP POLICY IF EXISTS "Admins can insert memberships" ON workspace_memberships;
CREATE POLICY "Admins can insert memberships" ON workspace_memberships
  FOR INSERT
  WITH CHECK (is_admin_in_workspace(workspace_id));

DROP POLICY IF EXISTS "Admins can update memberships" ON workspace_memberships;
CREATE POLICY "Admins can update memberships" ON workspace_memberships
  FOR UPDATE
  USING (is_admin_in_workspace(workspace_id))
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete memberships" ON workspace_memberships;
CREATE POLICY "Admins can delete memberships" ON workspace_memberships
  FOR DELETE
  USING (is_admin_in_workspace(workspace_id));

-- Update invitation policies
DROP POLICY IF EXISTS "Members can view workspace invitations" ON workspace_invitations;
CREATE POLICY "Members can view workspace invitations" ON workspace_invitations
  FOR SELECT
  USING (workspace_id IN (SELECT get_workspace_ids_for_current_user()));

DROP POLICY IF EXISTS "Admins can create invitations" ON workspace_invitations;
CREATE POLICY "Admins can create invitations" ON workspace_invitations
  FOR INSERT
  WITH CHECK (
    is_admin_in_workspace(workspace_id)
    AND invited_by = (auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "Admins can update invitations" ON workspace_invitations;
CREATE POLICY "Admins can update invitations" ON workspace_invitations
  FOR UPDATE
  USING (is_admin_in_workspace(workspace_id))
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete invitations" ON workspace_invitations;
CREATE POLICY "Admins can delete invitations" ON workspace_invitations
  FOR DELETE
  USING (is_admin_in_workspace(workspace_id));

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verification queries (run these after migration to confirm success):
-- SELECT 'workspaces' AS tbl, COUNT(*) AS cnt FROM workspaces
-- UNION ALL SELECT 'workspace_memberships', COUNT(*) FROM workspace_memberships
-- UNION ALL SELECT 'workspace_invitations', COUNT(*) FROM workspace_invitations;