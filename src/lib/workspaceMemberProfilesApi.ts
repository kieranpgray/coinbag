import type { WorkspaceMemberProfile } from '@/contracts/workspaces';

export const WORKSPACE_MEMBER_PROFILES_QUERY_KEY = 'workspaceMemberProfiles' as const;

export interface WorkspaceMemberProfilesResponse {
  profiles: WorkspaceMemberProfile[];
}

export interface WorkspaceMemberProfilesErrorBody {
  error: string;
}

export async function fetchWorkspaceMemberProfiles(
  getToken: () => Promise<string | null>,
  workspaceId: string
): Promise<WorkspaceMemberProfilesResponse> {
  const token = await getToken();
  if (!token) {
    throw new Error('Your session has expired. Sign in to continue.');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase configuration missing');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/workspace-member-profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-clerk-token': token,
    },
    body: JSON.stringify({ workspace_id: workspaceId }),
  });

  const data = (await response.json()) as WorkspaceMemberProfilesResponse & WorkspaceMemberProfilesErrorBody;

  if (response.status === 403) {
    throw new Error(data.error ?? 'Forbidden');
  }
  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to load member profiles');
  }

  if (!Array.isArray(data.profiles)) {
    throw new Error('Invalid response from server');
  }

  return { profiles: data.profiles };
}
