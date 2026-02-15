/**
 * Supported stock exchanges for Stock and RSU asset types.
 * Used in asset form dropdown and validation; single source of truth.
 */
export const SUPPORTED_EXCHANGES = [
  'NASDAQ',
  'NYSE',
  'ASX',
] as const;

export type SupportedExchange = (typeof SUPPORTED_EXCHANGES)[number];
