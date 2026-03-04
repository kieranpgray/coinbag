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
    throw new Error('Authentication required');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
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
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to create invite');
  }

  return data;
}