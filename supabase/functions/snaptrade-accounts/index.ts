/**
 * Supabase Edge Function: snaptrade-accounts
 *
 * Returns brokerage accounts for a specific connection after the portal
 * onSuccess callback fires. Filters all user accounts by authorizationId
 * and annotates each with isAlreadyImported.
 *
 * GET /functions/v1/snaptrade-accounts?authorizationId=<uuid>
 * Headers: x-clerk-token: <Clerk JWT>
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { snaptradeRequest, withRetry } from '../_shared/snaptradeRetry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getUserIdFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const payload = JSON.parse(atob(base64));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

interface SnapTradeRawAccount {
  id: string;
  brokerage_authorization: string;
  name: string;
  number?: string;
  meta?: { institution_name?: string; type?: string };
  balance?: { total?: { amount?: number; currency?: string } };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405);

  const clerkToken = req.headers.get('x-clerk-token');
  if (!clerkToken) return jsonResponse({ error: 'x-clerk-token header required' }, 401);

  const userId = getUserIdFromJwt(clerkToken);
  if (!userId) return jsonResponse({ error: 'Invalid token' }, 401);

  const url = new URL(req.url);
  const authorizationId = url.searchParams.get('authorizationId');
  if (!authorizationId) return jsonResponse({ error: 'authorizationId query param required' }, 400);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const clientId = Deno.env.get('SNAPTRADE_CLIENT_ID');
  const consumerKey = Deno.env.get('SNAPTRADE_CONSUMER_KEY');
  const encryptionKey = Deno.env.get('SNAPTRADE_ENCRYPTION_KEY');

  if (!supabaseUrl || !serviceRoleKey || !clientId || !consumerKey || !encryptionKey) {
    return jsonResponse({ error: 'Server configuration error' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: snapUser } = await supabase
    .from('snaptrade_users')
    .select('user_secret')
    .eq('user_id', userId)
    .maybeSingle();

  if (!snapUser) return jsonResponse({ error: 'SnapTrade user not found — please reconnect' }, 404);

  const { data: decrypted } = await supabase.rpc('decrypt_snaptrade_secret', {
    encrypted_secret: snapUser.user_secret,
    encryption_key: encryptionKey,
  });

  if (!decrypted) return jsonResponse({ error: 'Failed to retrieve credentials' }, 500);
  const userSecret = decrypted as string;

  let rawAccounts: SnapTradeRawAccount[];
  try {
    rawAccounts = await withRetry(() =>
      snaptradeRequest<SnapTradeRawAccount[]>({
        clientId,
        consumerKey,
        method: 'GET',
        path: '/accounts',
        queryParams: { userId, userSecret },
      })
    );
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    console.error('[snaptrade-accounts] Fetch failed:', err);
    if (status === 429) return jsonResponse({ error: 'rate_limited', retryAfter: 60 }, 429);
    return jsonResponse({ error: 'Failed to fetch accounts from SnapTrade' }, 502);
  }

  const filtered = rawAccounts.filter((a) => a.brokerage_authorization === authorizationId);

  if (filtered.length === 0) {
    return jsonResponse({ accounts: [], syncPending: true });
  }

  const snaptradeAccountIds = filtered.map((a) => a.id);
  const { data: alreadyImported } = await supabase
    .from('snaptrade_accounts')
    .select('snaptrade_account_id')
    .in('snaptrade_account_id', snaptradeAccountIds)
    .eq('is_imported', true);

  const importedSet = new Set(
    (alreadyImported ?? []).map((r: { snaptrade_account_id: string }) => r.snaptrade_account_id)
  );

  const accounts = filtered.map((a) => ({
    snaptradeAccountId: a.id,
    name: a.name,
    number: a.number ? `····${a.number.slice(-4)}` : null,
    institutionName: a.meta?.institution_name ?? null,
    type: a.meta?.type ?? null,
    balanceAmount: a.balance?.total?.amount ?? null,
    balanceCurrency: a.balance?.total?.currency ?? null,
    isAlreadyImported: importedSet.has(a.id),
  }));

  return jsonResponse({ accounts, syncPending: false });
});
