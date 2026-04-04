/**
 * Supabase Edge Function: snaptrade-sync-all (cron-invoked)
 *
 * Daily cron that fetches the latest balance for every active SnapTrade account
 * and updates both snaptrade_accounts and assets tables.
 *
 * Rate limit protection: stagger requests 500ms apart per account.
 * Respects 429 via exponential backoff (shared withRetry helper).
 *
 * Auth: CRON_SECRET in Authorization Bearer or x-cron-secret header.
 * (Same pattern as refresh-prices.)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withRetry } from '../_shared/snaptradeRetry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function snaptradeSign(params: {
  consumerKey: string;
  path: string;
  body: string;
  timestamp: string;
}): Promise<string> {
  const { consumerKey, path, body, timestamp } = params;
  const message = path + timestamp + body;
  const keyData = new TextEncoder().encode(consumerKey);
  const msgData = new TextEncoder().encode(message);
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, msgData);
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function fetchAccountBalances(params: {
  clientId: string;
  consumerKey: string;
  userId: string;
  userSecret: string;
}): Promise<Array<{ id: string; balance?: { total?: { amount?: number; currency?: string } } }>> {
  const { clientId, consumerKey, userId, userSecret } = params;
  const path = '/accounts';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const url = new URL(`https://api.snaptrade.com/api/v1${path}`);
  url.searchParams.set('userId', userId);
  url.searchParams.set('userSecret', userSecret);
  const signature = await snaptradeSign({ consumerKey, path, body: '', timestamp });

  const resp = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json', clientId, timestamp, Signature: signature },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    const err = new Error(`SnapTrade API error ${resp.status}: ${errText}`);
    (err as unknown as { statusCode: number }).statusCode = resp.status;
    throw err;
  }
  return resp.json();
}

const STAGGER_MS = 500;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const cronSecret = Deno.env.get('SNAPTRADE_SYNC_CRON_SECRET');
  const authHeader = req.headers.get('authorization');
  const cronHeader = req.headers.get('x-cron-secret');
  const providedSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (cronHeader ?? '');

  if (!cronSecret || !providedSecret || !secureCompare(cronSecret, providedSecret)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
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

  // Fetch all imported snaptrade accounts grouped by user
  const { data: importedAccounts, error: fetchError } = await supabase
    .from('snaptrade_accounts')
    .select('id, user_id, snaptrade_account_id, asset_id')
    .eq('is_imported', true);

  if (fetchError) {
    console.error('[snaptrade-sync-all] DB fetch failed:', fetchError.message);
    return jsonResponse({ error: 'Failed to load accounts' }, 500);
  }

  if (!importedAccounts || importedAccounts.length === 0) {
    return jsonResponse({ synced: 0, skipped: 0 });
  }

  // Group accounts by user_id to batch API calls per user
  const byUser = new Map<string, typeof importedAccounts>();
  for (const account of importedAccounts) {
    const list = byUser.get(account.user_id) ?? [];
    list.push(account);
    byUser.set(account.user_id, list);
  }

  let synced = 0;
  let skipped = 0;
  let userIndex = 0;

  for (const [userId, accounts] of byUser) {
    // Stagger per user to respect rate limits
    if (userIndex > 0) {
      await new Promise((r) => setTimeout(r, STAGGER_MS));
    }
    userIndex++;

    // Fetch userSecret
    const { data: snapUser } = await supabase
      .from('snaptrade_users')
      .select('user_secret')
      .eq('user_id', userId)
      .maybeSingle();

    if (!snapUser) {
      console.warn(`[snaptrade-sync-all] No snaptrade user for ${userId}, skipping`);
      skipped += accounts.length;
      continue;
    }

    const { data: decrypted } = await supabase.rpc('decrypt_snaptrade_secret', {
      encrypted_secret: snapUser.user_secret,
      encryption_key: encryptionKey,
    });

    if (!decrypted) {
      console.warn(`[snaptrade-sync-all] Could not decrypt secret for ${userId}, skipping`);
      skipped += accounts.length;
      continue;
    }

    const userSecret = decrypted as string;

    let rawBalances: Array<{ id: string; balance?: { total?: { amount?: number; currency?: string } } }>;
    try {
      rawBalances = await withRetry(() =>
        fetchAccountBalances({ clientId, consumerKey, userId, userSecret })
      );
    } catch (err) {
      console.error(`[snaptrade-sync-all] Balance fetch failed for user ${userId}:`, err);
      // Mark all their accounts with a sync error
      for (const account of accounts) {
        await supabase
          .from('snaptrade_accounts')
          .update({ sync_error: 'Balance fetch failed', updated_at: new Date().toISOString() })
          .eq('id', account.id);
      }
      skipped += accounts.length;
      continue;
    }

    const balanceMap = new Map(rawBalances.map((b) => [b.id, b.balance?.total]));

    for (const account of accounts) {
      const latestBalance = balanceMap.get(account.snaptrade_account_id);
      if (latestBalance === undefined) {
        // Account no longer in SnapTrade — mark stale
        await supabase
          .from('snaptrade_accounts')
          .update({ sync_error: 'Account not found in SnapTrade', updated_at: new Date().toISOString() })
          .eq('id', account.id);
        skipped++;
        continue;
      }

      const balanceAmount = latestBalance?.amount ?? null;
      const balanceCurrency = latestBalance?.currency ?? null;

      // Update snaptrade_accounts
      await supabase
        .from('snaptrade_accounts')
        .update({
          balance_amount: balanceAmount,
          balance_currency: balanceCurrency,
          last_balance_sync_at: new Date().toISOString(),
          sync_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id);

      // Update linked asset value
      if (account.asset_id && balanceAmount !== null) {
        await supabase
          .from('assets')
          .update({
            value: balanceAmount,
            balance_currency: balanceCurrency,
          })
          .eq('id', account.asset_id);
      }

      synced++;
    }
  }

  console.log(`[snaptrade-sync-all] Done: synced=${synced} skipped=${skipped}`);
  return jsonResponse({ synced, skipped });
});
