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

-- RLS: workspaces - creator can manage their own workspaces
CREATE POLICY "Users can view workspaces they belong to" ON workspaces
  FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (auth.jwt() ->> 'sub')
    )
    OR created_by = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = created_by);

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
CREATE POLICY "Members can view workspace memberships" ON workspace_memberships
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships wm2
      WHERE wm2.user_id = (auth.jwt() ->> 'sub')
    )
  );

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
CREATE POLICY "Members can view workspace invitations" ON workspace_invitations
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (auth.jwt() ->> 'sub')
    )
  );

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
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_memberships (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_workspace_add_creator_as_admin
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION create_workspace_add_creator_as_admin();

-- Trigger: updated_at on workspaces
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: updated_at on workspace_memberships
CREATE TRIGGER update_workspace_memberships_updated_at
  BEFORE UPDATE ON workspace_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: updated_at on workspace_invitations
CREATE TRIGGER update_workspace_invitations_updated_at
  BEFORE UPDATE ON workspace_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
