/**
 * Shared SnapTrade API helpers for Supabase Edge Functions.
 *
 * Signing logic extracted from snaptrade-typescript-sdk requestAfterHook.js:
 *   1. Build sigObject = { content, path, query } (content is null when no body)
 *   2. JSON-serialize with sorted keys (JSONstringifyOrder)
 *   3. HMAC-SHA256(sorted JSON, encodeURI(consumerKey))
 *   4. Base64 encode → Signature header
 *   5. timestamp (Unix seconds) added as query parameter
 *   6. clientId added as query parameter
 *
 * Retry helper: exponential backoff on HTTP 429.
 */

// ============================================================
// JSON with sorted keys (matches SDK's JSONstringifyOrder)
// ============================================================
function jsonStringifyOrdered(obj: unknown): string {
  const allKeys: string[] = [];
  const seen: Record<string, null> = {};
  JSON.stringify(obj, function (key, value) {
    if (!(key in seen)) {
      allKeys.push(key);
      seen[key] = null;
    }
    return value;
  });
  allKeys.sort();
  return JSON.stringify(obj, allKeys);
}

// ============================================================
// HMAC-SHA256 (Deno Web Crypto API — same as browser env path in SDK)
// ============================================================
async function computeHmac(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(key);
  const msgBuffer = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
  const byteArray = Array.from(new Uint8Array(sig));
  return btoa(String.fromCharCode(...byteArray));
}

// ============================================================
// Build + execute a signed SnapTrade API request
// ============================================================
export async function snaptradeRequest<T>(params: {
  clientId: string;
  consumerKey: string;
  method: string;
  /** Path without /api/v1 prefix, e.g. '/snapTrade/registerUser' */
  path: string;
  /** Query params (userId, userSecret etc.) — NOT including clientId/timestamp which are added here */
  queryParams?: Record<string, string>;
  body?: object | null;
}): Promise<T> {
  const { clientId, consumerKey, method, path, queryParams = {}, body = null } = params;

  const timestamp = Math.round(Date.now() / 1000).toString();

  // Build the URL with all query params (SDK appends clientId and timestamp as query params)
  const url = new URL(`https://api.snaptrade.com/api/v1${path}`);
  url.searchParams.set('clientId', clientId);
  url.searchParams.set('timestamp', timestamp);
  for (const [k, v] of Object.entries(queryParams)) {
    url.searchParams.set(k, v);
  }

  // Build the signature object exactly as the SDK does
  // requestPath = /api/v1 + path (without query string)
  const requestPath = `/api/v1${path}`;
  // requestQuery = query string without leading '?'
  const requestQuery = url.search.replace('?', '');

  // content: null when no body or body is empty {}
  const bodyStr = body ? JSON.stringify(body) : undefined;
  const parsedContent =
    !body || (bodyStr === '{}')
      ? null
      : body;

  const sigObject = {
    content: parsedContent,
    path: requestPath,
    query: requestQuery,
  };

  const sigContent = jsonStringifyOrdered(sigObject);
  const signature = await computeHmac(sigContent, encodeURI(consumerKey));

  const resp = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Signature': signature,
    },
    body: bodyStr,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    const err = new Error(`SnapTrade API error ${resp.status}: ${errText}`);
    (err as unknown as { statusCode: number }).statusCode = resp.status;
    throw err;
  }

  return resp.json() as Promise<T>;
}

// ============================================================
// Retry with exponential backoff on 429
// ============================================================
export interface RetryableError {
  statusCode?: number;
  message?: string;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status = (err as RetryableError)?.statusCode;

      if (status === 429 && attempt < maxAttempts) {
        const delayMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(`[snaptrade] Rate limited (429) — retrying in ${Math.round(delayMs)}ms (attempt ${attempt}/${maxAttempts})`);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}
