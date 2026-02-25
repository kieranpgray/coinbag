/**
 * Price refresh constants — intervals, limits, staleness thresholds
 * Used by PriceService and refresh-prices Edge Function
 */

/** Refresh intervals by asset_class (in milliseconds) */
export const PRICE_REFRESH_INTERVALS_MS: Record<string, number> = {
  stock: 24 * 60 * 60 * 1000,   // 24h
  etf: 24 * 60 * 60 * 1000,     // 24h
  forex: 24 * 60 * 60 * 1000,   // 24h
  crypto: 6 * 60 * 60 * 1000,   // 6h
  super: 7 * 24 * 60 * 60 * 1000, // 7d
  '401k': 7 * 24 * 60 * 60 * 1000, // 7d
};

/** Market close times (hour, minute, timezone) for future market-aware scheduling */
export const MARKET_CLOSE_TIMES = {
  ASX: { hour: 16, minute: 0, timezone: 'Australia/Sydney' },
  NYSE: { hour: 16, minute: 0, timezone: 'America/New_York' },
  NASDAQ: { hour: 16, minute: 0, timezone: 'America/New_York' },
  LSE: { hour: 16, minute: 30, timezone: 'Europe/London' },
} as const;

/** Manual refresh rate limits */
export const MANUAL_REFRESH_LIMITS = {
  maxPerDay: 3,
  cooldownMinutes: 360, // 6 hours
} as const;

/** Price staleness thresholds (in hours) for UI states */
export const PRICE_STALENESS_THRESHOLD = {
  warning: 36, // >36h = amber
  error: 72,   // >72h = red
} as const;

/** Price API providers (stub; real integration deferred) */
export const PRICE_API_PROVIDERS = {
  stocks: { provider: 'yahoo', baseUrl: '', rateLimitPerMinute: 60, batchSize: 10 },
  crypto: { provider: 'coingecko', baseUrl: '', rateLimitPerMinute: 30, batchSize: 50 },
  forex: { provider: 'exchangerate', baseUrl: '', rateLimitPerMinute: 100, batchSize: 1 },
} as const;
