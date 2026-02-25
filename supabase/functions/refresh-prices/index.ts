/**
 * Supabase Edge Function: refresh-prices (cron-invoked)
 *
 * Requires CRON_SECRET in Authorization Bearer or x-cron-secret header.
 * Uses SUPABASE_SERVICE_ROLE_KEY only inside the function for DB writes.
 * Never send service role key in requests.
 *
 * Plan: specs/price-refresh/SPEC.md
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const getCorrelationId = () => `refresh-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Constant-time string comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = getCorrelationId();
  const cronSecret = Deno.env.get('PRICE_REFRESH_CRON_SECRET');
  const authHeader = req.headers.get('authorization');
  const cronHeader = req.headers.get('x-cron-secret');

  const providedSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cronHeader ?? '';

  if (!cronSecret || !providedSecret || !secureCompare(cronSecret, providedSecret)) {
    console.error(`[${correlationId}] REFRESH_PRICES:401 Unauthorized - missing or invalid CRON_SECRET`);
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(`[${correlationId}] REFRESH_PRICES:500 Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`);
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const INTERVALS_MS: Record<string, number> = {
    stock: 24 * 60 * 60 * 1000,
    etf: 24 * 60 * 60 * 1000,
    forex: 24 * 60 * 60 * 1000,
    crypto: 6 * 60 * 60 * 1000,
    super: 7 * 24 * 60 * 60 * 1000,
    '401k': 7 * 24 * 60 * 60 * 1000,
  };

  try {
    const { data: allPrices, error: fetchError } = await supabase
      .from('symbol_prices')
      .select('id, symbol, asset_class, fetched_at');

    if (fetchError) {
      console.error(`[${correlationId}] REFRESH_PRICES:DB_FETCH failed`, fetchError.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch symbol_prices' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = Date.now();
    const staleRows =
      (allPrices ?? []).filter((row) => {
        const intervalMs = INTERVALS_MS[row.asset_class as string] ?? INTERVALS_MS.stock;
        const fetchedAt = new Date(row.fetched_at).getTime();
        return now - fetchedAt > intervalMs;
      }) ?? [];

    let refreshed = 0;
    let failed = 0;

    for (const row of staleRows) {
      try {
        // Stub: no external API call yet; skip actual upsert for MVP
        // In production: call Yahoo/CoinGecko/etc and upsert
        failed++;
      } catch (err) {
        failed++;
        console.error(`[${correlationId}] REFRESH_PRICES:FETCH_FAIL symbol=${row.symbol}`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: allPrices?.length ?? 0,
        stale: staleRows.length,
        refreshed,
        failed,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(`[${correlationId}] REFRESH_PRICES:ERROR`, err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
