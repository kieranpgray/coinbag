/**
 * Supabase Edge Function: workspace-invites
 *
 * Routes:
 * - POST /create  - Create or resend invite (upsert for pending)
 * - POST /accept  - Accept invite by token
 *
 * Requires Clerk JWT in x-clerk-token header for create/accept.
 * Clerk verified-email check via REST API for accept flow.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getUserIdFromJwt, userHasVerifiedEmail, INVITE_EXPIRY_DAYS } from './lib.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type WorkspaceRole = 'admin' | 'edit' | 'read';

interface CreateBody {
  action: 'create';
  workspace_id: string;
  email: string;
  role?: WorkspaceRole;
}

interface AcceptBody {
  action: 'accept';
  token: string;
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchClerkUserByEmail(clerkSecretKey: string, email: string): Promise<{
  id: string;
  email_addresses?: Array<{ email_address: string; verification?: { status: string } }>;
} | null> {
  const url = new URL('https://api.clerk.com/v1/users');
  url.searchParams.set('email_address', email.toLowerCase().trim());
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${clerkSecretKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (res.status >= 500) throw new Error('Clerk API unavailable');
  if (!res.ok) return null;
  const data = await res.json();
  const users = data.data ?? [];
  return users.length > 0 ? users[0] : null;
}

async function fetchClerkUserById(clerkSecretKey: string, userId: string): Promise<{
  id: string;
  email_addresses?: Array<{ email_address: string; verification?: { status: string } }>;
} | null> {
  const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${clerkSecretKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function handleCreate(
  body: CreateBody,
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Response> {
  const { workspace_id, email, role = 'edit' } = body;
  if (!workspace_id || !email || typeof email !== 'string') {
    return jsonResponse({ error: 'workspace_id and email are required' }, 400);
  }

  const emailTrimmed = email.toLowerCase().trim();
  if (!emailTrimmed) return jsonResponse({ error: 'Invalid email' }, 400);

  const validRoles: WorkspaceRole[] = ['admin', 'edit', 'read'];
  if (!validRoles.includes(role)) {
    return jsonResponse({ error: 'Invalid role' }, 400);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(workspace_id)) {
    return jsonResponse({ error: 'Invalid workspace_id format (must be UUID)' }, 400);
  }

  // Check inviter is admin
  const { data: membership, error: membershipError } = await supabase
    .from('workspace_memberships')
    .select('id')
    .eq('workspace_id', workspace_id)
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();

  if (membershipError || !membership) {
    return jsonResponse({ error: 'Forbidden: must be workspace admin' }, 403);
  }

  // Check invitee is not already a member (by email via Clerk)
  const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
  if (clerkSecretKey) {
    let existingUser: Awaited<ReturnType<typeof fetchClerkUserByEmail>>;
    try {
      existingUser = await fetchClerkUserByEmail(clerkSecretKey, emailTrimmed);
    } catch {
      return jsonResponse({ error: 'Clerk API unavailable' }, 503);
    }
    if (existingUser) {
      const { data: existingMember } = await supabase
        .from('workspace_memberships')
        .select('id')
        .eq('workspace_id', workspace_id)
        .eq('user_id', existingUser.id)
        .single();
      if (existingMember) {
        return jsonResponse({ error: 'Already a member' }, 409);
      }
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
  const token = crypto.randomUUID() + '-' + crypto.randomUUID().replace(/-/g, '');

  // Upsert: if pending invite exists for (workspace_id, email), update; else insert
  const { data: existing } = await supabase
    .from('workspace_invitations')
    .select('id')
    .eq('workspace_id', workspace_id)
    .eq('email', emailTrimmed)
    .is('accepted_at', null)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase
      .from('workspace_invitations')
      .update({
        token,
        expires_at: expiresAt.toISOString(),
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      return jsonResponse({ error: 'Failed to resend invitation' }, 500);
    }
    return jsonResponse({
      success: true,
      action: 'resend',
      email: emailTrimmed,
      expires_at: expiresAt.toISOString(),
    }, 200);
  }

  const { error: insertError } = await supabase.from('workspace_invitations').insert({
    workspace_id,
    email: emailTrimmed,
    role,
    token,
    expires_at: expiresAt.toISOString(),
    invited_by: userId,
  });

  if (insertError) {
    return jsonResponse({ error: 'Failed to create invitation' }, 500);
  }

  return jsonResponse({
    success: true,
    action: 'create',
    email: emailTrimmed,
    expires_at: expiresAt.toISOString(),
  }, 201);
}

export async function handleAccept(
  body: AcceptBody,
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Response> {
  const { token } = body;
  if (!token || typeof token !== 'string') {
    return jsonResponse({ error: 'token is required' }, 400);
  }

  const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
  if (!clerkSecretKey) {
    return jsonResponse({ error: 'Server configuration error' }, 500);
  }

  // Fetch invite to get email for verification
  const { data: invite, error: inviteError } = await supabase
    .from('workspace_invitations')
    .select('id, email, workspace_id')
    .eq('token', token)
    .single();

  if (inviteError || !invite) {
    return jsonResponse({ error: 'Invalid or expired invitation' }, 404);
  }

  const inviteEmail = (invite.email as string).toLowerCase().trim();

  // Verify user's email matches invite and is verified in Clerk
  const clerkUser = await fetchClerkUserById(clerkSecretKey, userId);
  if (!clerkUser) {
    return jsonResponse({ error: 'User not found' }, 404);
  }
  if (!userHasVerifiedEmail(clerkUser, inviteEmail)) {
    return jsonResponse({ error: 'Email must be verified and match the invitation' }, 403);
  }

  // Call atomic accept function (SECURITY DEFINER)
  const { data: result, error: rpcError } = await supabase.rpc('accept_workspace_invitation', {
    p_token: token,
    p_user_id: userId,
  });

  if (rpcError) {
    return jsonResponse({ error: rpcError.message || 'Failed to accept invitation' }, 500);
  }

  const res = result as { ok: boolean; error?: string; workspace_id?: string; role?: string };
  if (!res.ok) {
    const status = res.error === 'Already a member' ? 409 : 400;
    return jsonResponse({ error: res.error ?? 'Failed to accept' }, status);
  }

  return jsonResponse({
    success: true,
    workspace_id: res.workspace_id,
    role: res.role,
  }, 200);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const clerkToken = req.headers.get('x-clerk-token');
  if (!clerkToken) {
    return jsonResponse({ error: 'Clerk JWT token required in x-clerk-token header' }, 401);
  }

  const userId = getUserIdFromJwt(clerkToken);
  if (!userId) {
    return jsonResponse({ error: 'Invalid token' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'Server configuration error' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${clerkToken}` } },
  });

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const action = body?.action;
  if (action === 'create') {
    return handleCreate(body as CreateBody, supabase, userId);
  }
  if (action === 'accept') {
    return handleAccept(body as AcceptBody, supabase, userId);
  }

  return jsonResponse({ error: 'Invalid action. Use action: "create" or "accept"' }, 400);
});
