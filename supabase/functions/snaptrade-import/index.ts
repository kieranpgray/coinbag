/**
 * Supabase Edge Function: snaptrade-import
 *
 * Imports selected SnapTrade accounts as asset rows.
 *
 * POST /functions/v1/snaptrade-import
 * Headers: x-clerk-token: <Clerk JWT>
 * Body: { brokerageAuthorizationId: string, snaptradeAccountIds: string[] }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { snaptradeRequest, withRetry } from '../_shared/snaptradeRetry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

interface SnapTradeRawAuthorization {
  id: string;
  brokerage?: { slug?: string; name?: string };
  type?: string;
  disabled?: boolean;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const clerkToken = req.headers.get('x-clerk-token');
  if (!clerkToken) return jsonResponse({ error: 'x-clerk-token header required' }, 401);

  const userId = getUserIdFromJwt(clerkToken);
  if (!userId) return jsonResponse({ error: 'Invalid token' }, 401);

  let body: { brokerageAuthorizationId?: string; snaptradeAccountIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { brokerageAuthorizationId, snaptradeAccountIds } = body;

  if (!brokerageAuthorizationId || typeof brokerageAuthorizationId !== 'string') {
    return jsonResponse({ error: 'brokerageAuthorizationId is required' }, 400);
  }
  if (!Array.isArray(snaptradeAccountIds) || snaptradeAccountIds.length === 0) {
    return jsonResponse({ error: 'snaptradeAccountIds must be a non-empty array' }, 400);
  }

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

  if (!snapUser) return jsonResponse({ error: 'SnapTrade user not found' }, 404);

  const { data: decrypted } = await supabase.rpc('decrypt_snaptrade_secret', {
    encrypted_secret: snapUser.user_secret,
    encryption_key: encryptionKey,
  });

  if (!decrypted) return jsonResponse({ error: 'Failed to retrieve credentials' }, 500);
  const userSecret = decrypted as string;

  let allAccounts: SnapTradeRawAccount[];
  let authorizations: SnapTradeRawAuthorization[];

  try {
    [allAccounts, authorizations] = await Promise.all([
      withRetry(() => snaptradeRequest<SnapTradeRawAccount[]>({
        clientId, consumerKey, method: 'GET', path: '/accounts',
        queryParams: { userId, userSecret },
      })),
      withRetry(() => snaptradeRequest<SnapTradeRawAuthorization[]>({
        clientId, consumerKey, method: 'GET', path: '/authorizations',
        queryParams: { userId, userSecret },
      })),
    ]);
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    console.error('[snaptrade-import] SnapTrade fetch failed:', err);
    if (status === 429) return jsonResponse({ error: 'rate_limited', retryAfter: 60 }, 429);
    return jsonResponse({ error: 'Failed to fetch data from SnapTrade' }, 502);
  }

  const authorization = authorizations.find((a) => a.id === brokerageAuthorizationId);
  if (!authorization) return jsonResponse({ error: 'Authorization not found for this user' }, 404);

  const selectedAccounts = allAccounts.filter(
    (a) => snaptradeAccountIds.includes(a.id) && a.brokerage_authorization === brokerageAuthorizationId
  );

  if (selectedAccounts.length === 0) return jsonResponse({ error: 'No matching accounts found' }, 404);

  const { data: connectionRow, error: connError } = await supabase
    .from('snaptrade_connections')
    .upsert(
      {
        user_id: userId,
        brokerage_auth_id: brokerageAuthorizationId,
        brokerage_slug: authorization.brokerage?.slug ?? 'UNKNOWN',
        brokerage_name: authorization.brokerage?.name ?? 'Unknown Broker',
        connection_type: authorization.type ?? 'read',
        is_disabled: authorization.disabled ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'brokerage_auth_id', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  if (connError || !connectionRow) {
    console.error('[snaptrade-import] Connection upsert failed:', connError?.message);
    return jsonResponse({ error: 'Failed to save connection' }, 500);
  }

  const connectionId: string = connectionRow.id;
  const today = new Date().toISOString().split('T')[0];
  const imported: Array<{ assetId: string; accountName: string; balanceAmount: number | null; balanceCurrency: string | null }> = [];

  for (const account of selectedAccounts) {
    const balanceAmount = account.balance?.total?.amount ?? null;
    const balanceCurrency = account.balance?.total?.currency ?? null;
    const maskedNumber = account.number ? `····${account.number.slice(-4)}` : null;
    const institutionName = account.meta?.institution_name ?? authorization.brokerage?.name ?? null;

    const { data: accountRow, error: accountError } = await supabase
      .from('snaptrade_accounts')
      .upsert(
        {
          user_id: userId,
          connection_id: connectionId,
          snaptrade_account_id: account.id,
          account_name: account.name,
          account_number: maskedNumber,
          institution_name: institutionName,
          account_type: account.meta?.type ?? null,
          balance_amount: balanceAmount,
          balance_currency: balanceCurrency,
          is_imported: true,
          last_balance_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'snaptrade_account_id', ignoreDuplicates: false }
      )
      .select('id, asset_id')
      .single();

    if (accountError || !accountRow) {
      console.error('[snaptrade-import] Account upsert failed:', accountError?.message);
      return jsonResponse({ error: `Failed to save account ${account.name}` }, 500);
    }

    if (accountRow.asset_id) {
      await supabase
        .from('assets')
        .update({ value: balanceAmount ?? 0, balance_currency: balanceCurrency })
        .eq('id', accountRow.asset_id);

      imported.push({ assetId: accountRow.asset_id, accountName: account.name, balanceAmount, balanceCurrency });
      continue;
    }

    const { data: assetRow, error: assetError } = await supabase
      .from('assets')
      .insert({
        user_id: userId,
        name: account.name,
        type: 'Other asset',
        value: balanceAmount ?? 0,
        date_added: today,
        institution: institutionName,
        data_source: 'snaptrade',
        snaptrade_account_id: accountRow.id,
        balance_currency: balanceCurrency,
      })
      .select('id')
      .single();

    if (assetError || !assetRow) {
      console.error('[snaptrade-import] Asset insert failed:', assetError?.message);
      return jsonResponse({ error: `Failed to create asset for ${account.name}` }, 500);
    }

    await supabase
      .from('snaptrade_accounts')
      .update({ asset_id: assetRow.id })
      .eq('id', accountRow.id);

    imported.push({ assetId: assetRow.id, accountName: account.name, balanceAmount, balanceCurrency });
  }

  return jsonResponse({ imported });
});
