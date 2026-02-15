/**
 * Supported crypto symbols for Crypto asset type.
 * Used in asset form symbol search/select and import validation; single source of truth.
 */
export const SUPPORTED_CRYPTO_SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'ADA',
  'AVAX',
  'DOGE',
  'DOT',
  'MATIC',
  'LINK',
  'UNI',
  'ATOM',
  'LTC',
  'BCH',
  'ETC',
  'XLM',
  'ALGO',
  'VET',
  'FIL',
  'TRX',
  'NEAR',
  'APT',
  'ARB',
  'OP',
  'INJ',
  'SUI',
  'SEI',
  'TIA',
  'PEPE',
  'WIF',
  'SHIB',
] as const;

export type SupportedCryptoSymbol = (typeof SUPPORTED_CRYPTO_SYMBOLS)[number];
