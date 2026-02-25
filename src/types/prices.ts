/**
 * Price refresh types — symbol cache, refresh availability, fetch requests/results
 * DB snake_case maps to camelCase in types
 */

export type AssetClass = 'stock' | 'crypto' | 'etf' | 'forex' | 'super' | '401k';

export type Market = 'ASX' | 'NYSE' | 'NASDAQ' | 'LSE';

export interface SymbolPrice {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  price: number;
  currency: string;
  source?: string;
  market?: string;
  fetchedAt: string;
  createdAt: string;
}

export interface PriceRefreshLog {
  id: string;
  userId: string;
  refreshType: 'manual' | 'scheduled';
  symbolsRefreshed: string[] | null;
  createdAt: string;
}

export type PriceFreshnessStatus = 'fresh' | 'stale' | 'error';

export interface ManualRefreshAvailability {
  canRefresh: boolean;
  remainingRefreshes: number;
  nextAvailableAt: string | null;
  cooldownEndsAt: string | null;
}

export interface PriceFetchRequest {
  symbol: string;
  assetClass: AssetClass;
}

export interface PriceFetchResult {
  symbol: string;
  assetClass: AssetClass;
  price: number;
  currency: string;
  source?: string;
  fetchedAt: string;
}
