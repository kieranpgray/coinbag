/**
 * Supabase Edge Function: snaptrade-portal-url
 *
 * Generates a SnapTrade connection portal URL for the authenticated user.
 * Lazily registers the user with SnapTrade on first call.
 * Supports reconnect mode by accepting an optional brokerageAuthorizationId.
 *
 * POST /functions/v1/snaptrade-portal-url
 * Headers: x-clerk-token: <Clerk JWT>
 * Body: { reconnect?: string }  — brokerageAuthorizationId for reconnect flow
 *
 * Response: { redirectURI: string, sessionId: string }
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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const clerkToken = req.headers.get('x-clerk-token');
  if (!clerkToken) {
    return jsonResponse({ error: 'x-clerk-token header required' }, 401);
  }

  const userId = getUserIdFromJwt(clerkToken);
  if (!userId) {
    return jsonResponse({ error: 'Invalid token' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const clientId = Deno.env.get('SNAPTRADE_CLIENT_ID');
  const consumerKey = Deno.env.get('SNAPTRADE_CONSUMER_KEY');
  const encryptionKey = Deno.env.get('SNAPTRADE_ENCRYPTION_KEY');

  if (!supabaseUrl || !serviceRoleKey || !clientId || !consumerKey || !encryptionKey) {
    console.error('[snaptrade-portal-url] Missing required environment variables');
    return jsonResponse({ error: 'Server configuration error' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let reconnect: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.reconnect && typeof body.reconnect === 'string') {
      reconnect = body.reconnect;
    }
  } catch {
    // no body — fine
  }

  // Lazy SnapTrade user registration
  let userSecret: string;

  const { data: existingUser, error: fetchError } = await supabase
    .from('snaptrade_users')
    .select('user_secret')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    console.error('[snaptrade-portal-url] DB fetch error:', fetchError.message);
    return jsonResponse({ error: 'Database error' }, 500);
  }

  if (existingUser) {
    const { data: decrypted, error: decryptError } = await supabase.rpc('decrypt_snaptrade_secret', {
      encrypted_secret: existingUser.user_secret,
      encryption_key: encryptionKey,
    });

    if (decryptError || !decrypted) {
      console.error('[snaptrade-portal-url] Decrypt error:', decryptError?.message);
      return jsonResponse({ error: 'Failed to retrieve credentials' }, 500);
    }

    userSecret = decrypted as string;
  } else {
    // Register new user with SnapTrade
    let newSecret: string;
    try {
      const data = await withRetry(() =>
        snaptradeRequest<{ userSecret: string }>({
          clientId,
          consumerKey,
          method: 'POST',
          path: '/snapTrade/registerUser',
          body: { userId },
        })
      );
      newSecret = data.userSecret;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode;
      console.error('[snaptrade-portal-url] Registration failed:', err);
      if (status === 429) return jsonResponse({ error: 'rate_limited', retryAfter: 60 }, 429);
      return jsonResponse({ error: 'Failed to register with SnapTrade' }, 502);
    }

    // Encrypt and store
    const { data: encrypted, error: encryptError } = await supabase.rpc('encrypt_snaptrade_secret', {
      raw_secret: newSecret,
      encryption_key: encryptionKey,
    });

    if (encryptError || !encrypted) {
      console.error('[snaptrade-portal-url] Encrypt error:', encryptError?.message);
      return jsonResponse({ error: 'Failed to store credentials' }, 500);
    }

    const { error: insertError } = await supabase.from('snaptrade_users').insert({
      user_id: userId,
      snaptrade_user_id: userId,
      user_secret: encrypted,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        // Race: another request registered simultaneously — fetch the existing record
        const { data: retryUser } = await supabase
          .from('snaptrade_users')
          .select('user_secret')
          .eq('user_id', userId)
          .single();

        if (!retryUser) return jsonResponse({ error: 'Database error after conflict' }, 500);

        const { data: retryDecrypted } = await supabase.rpc('decrypt_snaptrade_secret', {
          encrypted_secret: retryUser.user_secret,
          encryption_key: encryptionKey,
        });
        userSecret = retryDecrypted as string;
      } else {
        console.error('[snaptrade-portal-url] Insert error:', insertError.message);
        return jsonResponse({ error: 'Failed to save credentials' }, 500);
      }
    } else {
      userSecret = newSecret;
    }
  }

  // Generate portal URL
  let portalData: { redirectURI: string; sessionId: string };
  try {
    const body: Record<string, string> = {};
    if (reconnect) body.reconnect = reconnect;

    portalData = await withRetry(() =>
      snaptradeRequest<{ redirectURI: string; sessionId: string }>({
        clientId,
        consumerKey,
        method: 'POST',
        path: '/snapTrade/login',
        queryParams: { userId, userSecret },
        body: Object.keys(body).length > 0 ? body : null,
      })
    );
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    console.error('[snaptrade-portal-url] Login URL generation failed:', err);
    if (status === 429) return jsonResponse({ error: 'rate_limited', retryAfter: 60 }, 429);
    return jsonResponse({ error: 'Failed to generate connection URL' }, 502);
  }

  return jsonResponse({
    redirectURI: portalData.redirectURI,
    sessionId: portalData.sessionId,
  });
});
