/**
 * SnapTrade API client — wraps all edge function calls.
 *
 * Edge functions are deployed with --no-verify-jwt (Supabase gateway does not
 * enforce JWT). Auth is handled inside each function via the x-clerk-token header,
 * matching the workspace-invites pattern used elsewhere in this project.
 *
 * Never passes SNAPTRADE_CONSUMER_KEY or userSecret — those live server-side only.
 */

const getSupabaseUrl = () => import.meta.env.VITE_SUPABASE_URL as string;
const getAnonKey = () => import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function snaptradePost<T>(
  path: string,
  getToken: () => Promise<string | null>,
  body?: object
): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');

  const resp = await fetch(`${getSupabaseUrl()}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': getAnonKey(),
      'x-clerk-token': token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await resp.json();
  if (!resp.ok) {
    const err = new Error(data?.error ?? `Request failed (${resp.status})`);
    (err as Error & { status: number }).status = resp.status;
    throw err;
  }
  return data as T;
}

async function snaptradeGet<T>(
  path: string,
  getToken: () => Promise<string | null>
): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');

  const resp = await fetch(`${getSupabaseUrl()}/functions/v1/${path}`, {
    method: 'GET',
    headers: {
      'apikey': getAnonKey(),
      'x-clerk-token': token,
    },
  });

  const data = await resp.json();
  if (!resp.ok) {
    const err = new Error(data?.error ?? `Request failed (${resp.status})`);
    (err as Error & { status: number }).status = resp.status;
    throw err;
  }
  return data as T;
}

export interface PortalUrlResponse {
  redirectURI: string;
  sessionId: string;
}

export interface SnaptradeAccount {
  snaptradeAccountId: string;
  name: string;
  number: string | null;
  institutionName: string | null;
  type: string | null;
  balanceAmount: number | null;
  balanceCurrency: string | null;
  isAlreadyImported: boolean;
}

export interface AccountsResponse {
  accounts: SnaptradeAccount[];
  syncPending: boolean;
}

export interface ImportedAccount {
  assetId: string;
  accountName: string;
  balanceAmount: number | null;
  balanceCurrency: string | null;
}

export interface ImportResponse {
  imported: ImportedAccount[];
}

/** Generate a SnapTrade connection portal URL. Pass reconnect to fix a broken connection. */
export async function getPortalUrl(
  getToken: () => Promise<string | null>,
  reconnect?: string
): Promise<PortalUrlResponse> {
  return snaptradePost<PortalUrlResponse>('snaptrade-portal-url', getToken, reconnect ? { reconnect } : undefined);
}

/** Fetch accounts from SnapTrade for a specific authorization. */
export async function getSnaptradeAccounts(
  getToken: () => Promise<string | null>,
  authorizationId: string
): Promise<AccountsResponse> {
  return snaptradeGet<AccountsResponse>(
    `snaptrade-accounts?authorizationId=${encodeURIComponent(authorizationId)}`,
    getToken
  );
}

/** Import selected SnapTrade accounts as assets. */
export async function importSnaptradeAccounts(
  getToken: () => Promise<string | null>,
  brokerageAuthorizationId: string,
  snaptradeAccountIds: string[]
): Promise<ImportResponse> {
  return snaptradePost<ImportResponse>('snaptrade-import', getToken, {
    brokerageAuthorizationId,
    snaptradeAccountIds,
  });
}
