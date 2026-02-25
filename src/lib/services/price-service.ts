/**
 * Price service — symbol cache reads, manual refresh, type→asset_class mapping
 * Symbol for price lookup = asset.ticker (normalized). Asset class = mapAssetTypeToPriceAssetClass(asset.type).
 */

import { createAuthenticatedSupabaseClient, getUserIdFromToken } from '@/lib/supabaseClient';
import {
  PRICE_REFRESH_INTERVALS_MS,
  MANUAL_REFRESH_LIMITS,
  PRICE_STALENESS_THRESHOLD,
} from '@/lib/constants/price-refresh';
import type {
  AssetClass,
  ManualRefreshAvailability,
  PriceFetchRequest,
  PriceFetchResult,
  PriceFreshnessStatus,
  SymbolPrice,
} from '@/types/prices';

const ASSET_TYPE_TO_CLASS: Record<string, AssetClass> = {
  Stock: 'stock',
  RSU: 'stock',
  Crypto: 'crypto',
  Superannuation: 'super',
  'Other Investments': 'stock',
  Investments: 'stock', // legacy; DB migrated to Other Investments
};

/** Map asset type (e.g. Stock, RSU, Superannuation) to price cache asset_class */
export function mapAssetTypeToPriceAssetClass(assetType: string): AssetClass | null {
  const mapped = ASSET_TYPE_TO_CLASS[assetType];
  return mapped ?? null;
}

/** Normalize symbol for cache lookup (e.g. uppercase) */
function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

/** Get refresh interval in ms for asset_class */
function getIntervalMs(assetClass: AssetClass): number {
  const ms = PRICE_REFRESH_INTERVALS_MS[assetClass];
  return typeof ms === 'number' ? ms : DEFAULT_INTERVAL_MS;
}

export function isPriceStale(fetchedAt: string | null | undefined, assetClass: AssetClass): boolean {
  if (!fetchedAt) return true;
  const ms = getIntervalMs(assetClass);
  const fetched = new Date(fetchedAt).getTime();
  return Date.now() - fetched > ms;
}

export function getPriceFreshnessStatus(
  fetchedAt: string | null | undefined,
  _assetClass: AssetClass
): PriceFreshnessStatus {
  if (!fetchedAt) return 'error';
  const ageMs = Date.now() - new Date(fetchedAt).getTime();
  const ageHours = ageMs / (60 * 60 * 1000);
  if (ageHours > PRICE_STALENESS_THRESHOLD.error) return 'error';
  if (ageHours > PRICE_STALENESS_THRESHOLD.warning) return 'stale';
  return 'fresh';
}

export async function getManualRefreshAvailability(
  getToken: () => Promise<string | null>,
  userId: string
): Promise<ManualRefreshAvailability> {
  const supabase = await createAuthenticatedSupabaseClient(getToken);

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: manualRefreshes, error } = await supabase
    .from('user_price_refreshes')
    .select('created_at')
    .eq('user_id', userId)
    .eq('refresh_type', 'manual')
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: false });

  if (error) {
    return {
      canRefresh: false,
      remainingRefreshes: 0,
      nextAvailableAt: null,
      cooldownEndsAt: null,
    };
  }

  const count = manualRefreshes?.length ?? 0;
  const remainingRefreshes = Math.max(0, MANUAL_REFRESH_LIMITS.maxPerDay - count);
  const latestRefresh = manualRefreshes?.[0]?.created_at;
  const lastRefreshAt = latestRefresh ? new Date(latestRefresh) : null;

  const cooldownMs = MANUAL_REFRESH_LIMITS.cooldownMinutes * 60 * 1000;
  const cooldownEndsAt = lastRefreshAt
    ? new Date(lastRefreshAt.getTime() + cooldownMs)
    : null;

  const inCooldown = lastRefreshAt && Date.now() - lastRefreshAt.getTime() < cooldownMs;
  const canRefresh = remainingRefreshes > 0 && !inCooldown;

  return {
    canRefresh,
    remainingRefreshes,
    nextAvailableAt: inCooldown && cooldownEndsAt ? cooldownEndsAt.toISOString() : null,
    cooldownEndsAt: cooldownEndsAt?.toISOString() ?? null,
  };
}

export async function getSymbolPrice(
  getToken: () => Promise<string | null>,
  symbol: string,
  assetClass: AssetClass
): Promise<SymbolPrice | null> {
  const supabase = await createAuthenticatedSupabaseClient(getToken);
  const sym = normalizeSymbol(symbol);

  const { data, error } = await supabase
    .from('symbol_prices')
    .select('*')
    .eq('symbol', sym)
    .eq('asset_class', assetClass)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    symbol: data.symbol,
    assetClass: data.asset_class as AssetClass,
    price: Number(data.price),
    currency: data.currency ?? 'USD',
    source: data.source ?? undefined,
    market: data.market ?? undefined,
    fetchedAt: data.fetched_at,
    createdAt: data.created_at,
  };
}

export async function getSymbolPrices(
  getToken: () => Promise<string | null>,
  requests: PriceFetchRequest[]
): Promise<SymbolPrice[]> {
  if (requests.length === 0) return [];
  const supabase = await createAuthenticatedSupabaseClient(getToken);

  const results: SymbolPrice[] = [];
  for (const r of requests) {
    const sym = normalizeSymbol(r.symbol);
    const { data } = await supabase
      .from('symbol_prices')
      .select('*')
      .eq('symbol', sym)
      .eq('asset_class', r.assetClass)
      .maybeSingle();
    if (data) {
      results.push({
        id: data.id,
        symbol: data.symbol,
        assetClass: data.asset_class as AssetClass,
        price: Number(data.price),
        currency: data.currency ?? 'USD',
        source: data.source ?? undefined,
        market: data.market ?? undefined,
        fetchedAt: data.fetched_at,
        createdAt: data.created_at,
      });
    }
  }
  return results;
}

/** Stub: fetch prices from external API. Replace with real provider (Yahoo, CoinGecko, etc.) */
async function fetchPricesFromApi(_requests: PriceFetchRequest[]): Promise<PriceFetchResult[]> {
  return [];
}

/** Upsert fetched prices into symbol_prices. Uses authenticated client (RLS applies). */
async function upsertSymbolPrices(
  getToken: () => Promise<string | null>,
  results: PriceFetchResult[]
): Promise<void> {
  if (results.length === 0) return;
  const supabase = await createAuthenticatedSupabaseClient(getToken);

  const rows = results.map((r) => ({
    symbol: normalizeSymbol(r.symbol),
    asset_class: r.assetClass,
    price: r.price,
    currency: r.currency,
    source: r.source ?? null,
    fetched_at: r.fetchedAt,
  }));

  for (const row of rows) {
    await supabase.from('symbol_prices').upsert(row, {
      onConflict: 'symbol,asset_class',
    });
  }
}

export async function fetchAndUpdatePrices(
  getToken: () => Promise<string | null>,
  requests: PriceFetchRequest[]
): Promise<{ refreshed: number; failed: number }> {
  const fetched = await fetchPricesFromApi(requests);
  if (fetched.length === 0) return { refreshed: 0, failed: requests.length };
  await upsertSymbolPrices(getToken, fetched);
  return { refreshed: fetched.length, failed: requests.length - fetched.length };
}

export async function triggerManualRefresh(
  getToken: () => Promise<string | null>,
  requests: PriceFetchRequest[]
): Promise<{ success: boolean; error?: string }> {
  const token = await getToken();
  if (!token) {
    return { success: false, error: 'Authentication required' };
  }

  const userId = await getUserIdFromToken(getToken);
  if (!userId) {
    return { success: false, error: 'Authentication required' };
  }

  const availability = await getManualRefreshAvailability(getToken, userId);
  if (!availability.canRefresh) {
    return { success: false, error: 'Refresh unavailable; try again later' };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Configuration error' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/manual-refresh`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'x-clerk-token': token,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ requests }),
    });

    const data = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string };
    if (!response.ok) {
      return { success: false, error: data.error ?? 'Refresh failed' };
    }
    return { success: data.success ?? true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Refresh failed',
    };
  }
}
