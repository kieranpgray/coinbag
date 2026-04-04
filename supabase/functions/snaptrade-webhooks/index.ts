/**
 * Supabase Edge Function: snaptrade-webhooks
 *
 * Receives and processes SnapTrade push notifications.
 * Security: verifies HMAC-SHA256 signature from SnapTrade before processing.
 * Idempotency: skips events already present in snaptrade_webhook_events.
 *
 * SnapTrade sends webhooks as POST requests with:
 *   - Signature header: base64(HMAC-SHA256(consumerKey, rawBody + timestamp))
 *   - Timestamp header (Unix seconds)
 *   - JSON body with webhookId, eventType, data
 *
 * POST /functions/v1/snaptrade-webhooks
 * No auth header required — verified via HMAC signature.
 *
 * Always returns 200 to prevent SnapTrade retry loops on application errors.
 * Returns non-200 only for missing/invalid signatures (legitimate rejects).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Verify HMAC-SHA256 signature from SnapTrade */
async function verifySignature(params: {
  consumerKey: string;
  rawBody: string;
  timestamp: string;
  receivedSignature: string;
}): Promise<boolean> {
  const { consumerKey, rawBody, timestamp, receivedSignature } = params;
  const message = rawBody + timestamp;
  const keyData = new TextEncoder().encode(consumerKey);
  const msgData = new TextEncoder().encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, msgData);
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== receivedSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ receivedSignature.charCodeAt(i);
  }
  return mismatch === 0;
}

interface WebhookPayload {
  webhookId: string;
  eventType: string;
  userId?: string;
  data?: {
    brokerageAuthorizationId?: string;
    accountId?: string;
    balance?: { amount?: number; currency?: string };
  };
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const consumerKey = Deno.env.get('SNAPTRADE_CONSUMER_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!consumerKey || !supabaseUrl || !serviceRoleKey) {
    console.error('[snaptrade-webhooks] Missing required env vars');
    return jsonResponse({ error: 'Server configuration error' }, 500);
  }

  // Read raw body first (needed for signature verification)
  const rawBody = await req.text();

  // Verify timestamp is within 5 minutes (prevent replay attacks)
  const timestamp = req.headers.get('timestamp') ?? '';
  if (!timestamp) {
    return jsonResponse({ error: 'Missing timestamp header' }, 400);
  }
  const requestAge = Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp, 10));
  if (requestAge > 300) {
    return jsonResponse({ error: 'Request timestamp too old' }, 400);
  }

  // Verify signature
  const receivedSignature = req.headers.get('Signature') ?? '';
  if (!receivedSignature) {
    return jsonResponse({ error: 'Missing Signature header' }, 400);
  }

  const valid = await verifySignature({
    consumerKey,
    rawBody,
    timestamp,
    receivedSignature,
  });

  if (!valid) {
    console.warn('[snaptrade-webhooks] Invalid signature');
    return jsonResponse({ error: 'Invalid signature' }, 401);
  }

  // Parse payload
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { webhookId, eventType, userId, data } = payload;

  if (!webhookId || !eventType) {
    return jsonResponse({ error: 'webhookId and eventType are required' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Idempotency check — skip if we've already processed this webhookId
  const { data: existing } = await supabase
    .from('snaptrade_webhook_events')
    .select('id')
    .eq('webhook_id', webhookId)
    .maybeSingle();

  if (existing) {
    console.log(`[snaptrade-webhooks] Skipping duplicate webhookId: ${webhookId}`);
    return jsonResponse({ ok: true, status: 'duplicate' });
  }

  // Record the event first for idempotency (even if processing fails below)
  let processingStatus = 'ok';
  let processingError: string | null = null;

  try {
    await processWebhookEvent(supabase, eventType, userId ?? null, data ?? {});
  } catch (err: unknown) {
    processingStatus = 'error';
    processingError = (err as Error).message;
    console.error(`[snaptrade-webhooks] Processing error for ${eventType}:`, err);
    // Don't rethrow — we still want to record the event and return 200
  }

  await supabase.from('snaptrade_webhook_events').insert({
    webhook_id: webhookId,
    event_type: eventType,
    user_id: userId ?? null,
    payload: payload,
    processing_status: processingStatus,
  });

  if (processingError) {
    console.error('[snaptrade-webhooks] Event recorded with error status:', processingError);
  }

  return jsonResponse({ ok: true, status: processingStatus });
});

async function processWebhookEvent(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  userId: string | null,
  data: NonNullable<WebhookPayload['data']>
): Promise<void> {
  switch (eventType) {
    case 'ACCOUNT_HOLDINGS_UPDATED': {
      const { accountId } = data;
      if (!accountId || !userId) return;

      // Fetch latest balance from SnapTrade would require calling the API here.
      // For now we mark the account as needing a sync so the next cron run picks it up.
      // The sync-all function handles the actual balance refresh.
      await supabase
        .from('snaptrade_accounts')
        .update({
          sync_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('snaptrade_account_id', accountId)
        .eq('user_id', userId);
      break;
    }

    case 'CONNECTION_BROKEN': {
      const { brokerageAuthorizationId } = data;
      if (!brokerageAuthorizationId) return;

      await supabase
        .from('snaptrade_connections')
        .update({
          is_disabled: true,
          disabled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('brokerage_auth_id', brokerageAuthorizationId);
      break;
    }

    case 'CONNECTION_FIXED': {
      const { brokerageAuthorizationId } = data;
      if (!brokerageAuthorizationId) return;

      await supabase
        .from('snaptrade_connections')
        .update({
          is_disabled: false,
          disabled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('brokerage_auth_id', brokerageAuthorizationId);
      break;
    }

    case 'CONNECTION_DELETED': {
      const { brokerageAuthorizationId } = data;
      if (!brokerageAuthorizationId) return;

      // Mark all associated accounts as not imported but keep assets (user data preservation)
      const { data: connection } = await supabase
        .from('snaptrade_connections')
        .select('id')
        .eq('brokerage_auth_id', brokerageAuthorizationId)
        .maybeSingle();

      if (connection) {
        await supabase
          .from('snaptrade_accounts')
          .update({ is_imported: false, updated_at: new Date().toISOString() })
          .eq('connection_id', connection.id);
      }

      await supabase
        .from('snaptrade_connections')
        .delete()
        .eq('brokerage_auth_id', brokerageAuthorizationId);
      break;
    }

    case 'NEW_ACCOUNT_AVAILABLE': {
      // A new account appeared under an existing connection.
      // Flag this in the connection so the UI can prompt "new account available".
      const { brokerageAuthorizationId } = data;
      if (!brokerageAuthorizationId) return;

      await supabase
        .from('snaptrade_connections')
        .update({ updated_at: new Date().toISOString() })
        .eq('brokerage_auth_id', brokerageAuthorizationId);
      break;
    }

    case 'ACCOUNT_REMOVED': {
      const { accountId } = data;
      if (!accountId) return;

      // Mark account as removed; keep the asset row for historical data
      await supabase
        .from('snaptrade_accounts')
        .update({
          is_imported: false,
          sync_error: 'Account removed from broker',
          updated_at: new Date().toISOString(),
        })
        .eq('snaptrade_account_id', accountId);
      break;
    }

    default:
      console.log(`[snaptrade-webhooks] Unhandled event type: ${eventType}`);
  }
}
