/**
 * API client for workspace invites edge function
 */

export interface CreateWorkspaceInviteRequest {
  action: 'create';
  workspace_id: string;
  email: string;
  role: 'admin' | 'edit' | 'read';
}

export interface CreateWorkspaceInviteResponse {
  success: boolean;
  action?: 'create' | 'resend';
  invitation?: {
    id: string;
    workspace_id: string;
    email: string;
    role: string;
    expires_at: string;
    invited_by: string;
    created_at: string;
    updated_at: string;
  };
  error?: string;
}

export async function createWorkspaceInvite(
  getToken: () => Promise<string | null>,
  workspaceId: string,
  email: string,
  role: 'admin' | 'edit' | 'read'
): Promise<CreateWorkspaceInviteResponse> {
  const token = await getToken();
  if (!token) {
    throw new Error('Your session has expired. Sign in to continue.');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('Supabase configuration missing');
  }

  const requestBody: CreateWorkspaceInviteRequest = {
    action: 'create',
    workspace_id: workspaceId,
    email,
    role,
  };

  const response = await fetch(`${supabaseUrl}/functions/v1/workspace-invites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-clerk-token': token,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to create invite');
  }

  return data;
}

export interface AcceptWorkspaceInviteResponse {
  workspace_id: string;
  role: string;
}

export async function acceptWorkspaceInvite(
  getToken: () => Promise<string | null>,
  token: string
): Promise<AcceptWorkspaceInviteResponse> {
  const clerkToken = await getToken();
  if (!clerkToken) throw new Error('Your session has expired. Sign in to continue.');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Supabase configuration missing');

  const response = await fetch(`${supabaseUrl}/functions/v1/workspace-invites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-clerk-token': clerkToken,
    },
    body: JSON.stringify({ action: 'accept', token }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Failed to accept invite');
  return data;
}