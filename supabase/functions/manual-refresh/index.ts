/**
 * Supabase Edge Function: manual-refresh (user-invoked via x-clerk-token)
 *
 * Accepts Clerk JWT in x-clerk-token header. Uses anon key + JWT for RLS.
 * Uses SUPABASE_SERVICE_ROLE_KEY only for upserting symbol_prices.
 * Plan: specs/price-refresh/SPEC.md
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MANUAL_REFRESH_LIMITS = { maxPerDay: 3, cooldownMinutes: 360 };

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clerkToken = req.headers.get('x-clerk-token');
  if (!clerkToken) {
    return new Response(
      JSON.stringify({ success: false, error: 'Clerk JWT required in x-clerk-token header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Decode JWT payload to get sub (Clerk user id). Supabase verifies JWT when using anon+JWT client.
  let userId: string | null = null;
  try {
    const parts = clerkToken.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      userId = payload.sub ?? null;
    }
  } catch {
    // ignore
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${clerkToken}` } },
  });

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: { requests?: Array<{ symbol: string; assetClass: string }> };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const requests = body?.requests ?? [];
  if (requests.length === 0) {
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sixHoursMs = MANUAL_REFRESH_LIMITS.cooldownMinutes * 60 * 1000;

  const { data: manualRefreshes } = await supabaseAuth
    .from('user_price_refreshes')
    .select('created_at')
    .eq('user_id', userId)
    .eq('refresh_type', 'manual')
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: false });

  const count = manualRefreshes?.length ?? 0;
  const remaining = Math.max(0, MANUAL_REFRESH_LIMITS.maxPerDay - count);
  const latest = manualRefreshes?.[0]?.created_at;
  const inCooldown = latest && Date.now() - new Date(latest).getTime() < sixHoursMs;

  if (remaining <= 0 || inCooldown) {
    return new Response(
      JSON.stringify({ success: false, error: 'Refresh unavailable; try again later' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const symbols = requests.map((r: { symbol: string }) => String(r.symbol).trim().toUpperCase());

  const { error: insertError } = await supabaseAuth.from('user_price_refreshes').insert({
    user_id: userId,
    refresh_type: 'manual',
    symbols_refreshed: symbols,
  });

  if (insertError) {
    return new Response(
      JSON.stringify({ success: false, error: insertError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const now = new Date().toISOString();
  const rows = requests.map((r: { symbol: string; assetClass: string }) => ({
    symbol: String(r.symbol).trim().toUpperCase(),
    asset_class: r.assetClass ?? 'stock',
    price: 0,
    currency: 'USD',
    fetched_at: now,
  }));

  for (const row of rows) {
    await supabaseAdmin.from('symbol_prices').upsert(row, {
      onConflict: 'symbol,asset_class',
    });
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
