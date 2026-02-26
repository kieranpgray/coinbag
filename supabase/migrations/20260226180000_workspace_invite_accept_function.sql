-- Migration: Atomic workspace invite accept function
-- Description: SECURITY DEFINER function for accepting invites atomically
-- Prevents race conditions between invite acceptance and membership creation

CREATE OR REPLACE FUNCTION accept_workspace_invitation(
  p_token text,
  p_user_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite workspace_invitations%ROWTYPE;
  v_workspace_id uuid;
  v_role workspace_role;
  v_email text;
BEGIN
  -- 1. Find invite by token
  SELECT * INTO v_invite
  FROM workspace_invitations
  WHERE token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- 2. Check not already accepted
  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invitation already accepted');
  END IF;

  -- 3. Check not expired
  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invitation has expired');
  END IF;

  v_workspace_id := v_invite.workspace_id;
  v_role := v_invite.role;
  v_email := lower(trim(v_invite.email));

  -- 4. Check user is not already a member
  IF EXISTS (
    SELECT 1 FROM workspace_memberships
    WHERE workspace_id = v_workspace_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Already a member');
  END IF;

  -- 5. Mark invite as accepted
  UPDATE workspace_invitations
  SET accepted_at = now(), updated_at = now()
  WHERE id = v_invite.id;

  -- 6. Create membership
  INSERT INTO workspace_memberships (workspace_id, user_id, role)
  VALUES (v_workspace_id, p_user_id, v_role);

  RETURN jsonb_build_object(
    'ok', true,
    'workspace_id', v_workspace_id,
    'role', v_role
  );
END;
$$;

COMMENT ON FUNCTION accept_workspace_invitation(text, text) IS
  'Atomically accepts a workspace invitation by token for the given user_id. Returns {ok, error} or {ok, workspace_id, role}.';
