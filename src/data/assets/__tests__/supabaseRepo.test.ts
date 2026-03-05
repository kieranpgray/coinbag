import { describe, it, expect } from 'vitest';

// Test the fallback utility functions in isolation
// These functions mirror the logic in SupabaseAssetsRepository
const stripOptionalColumnsForFallback = (dbInput: Record<string, unknown>, level: 'assetFields' | 'priceFields' | 'basic'): Record<string, unknown> => {
  const stripped = { ...dbInput };

  if (level === 'assetFields' || level === 'priceFields' || level === 'basic') {
    // Remove asset-fields columns (address, property_type, grant_price)
    delete stripped.address;
    delete stripped.property_type;
    delete stripped.grant_price;
  }

  if (level === 'priceFields' || level === 'basic') {
    // Remove price caching columns
    delete stripped.last_price_fetched_at;
    delete stripped.price_source;
  }

  if (level === 'basic') {
    // Remove Stock/RSU columns
    delete stripped.ticker;
    delete stripped.exchange;
    delete stripped.quantity;
    delete stripped.purchase_price;
    delete stripped.purchase_date;
    delete stripped.todays_price;
    delete stripped.grant_date;
    delete stripped.vesting_date;
  }

  return stripped;
};

const isMissingColumnOrBadRequest = (error: { code?: string; message?: string; status?: number }): boolean => {
  const code = error?.code ?? '';
  const status = typeof error !== 'undefined' && error !== null && 'status' in error
    ? (error as { status?: number }).status
    : undefined;
  const msg = (error?.message ?? '').toLowerCase();
  const looksLikeBadRequest = status === 400 || msg.includes('bad request') || msg.includes('400') || code === 'PGRST204';
  return (
    code === '42703' ||
    code === 'PGRST100' ||
    code === 'PGRST204' ||
    looksLikeBadRequest ||
    (msg.includes('column') && (msg.includes('does not exist') || msg.includes('ticker') || msg.includes('purchase_price') || msg.includes('vesting_date') || msg.includes('last_price_fetched_at') || msg.includes('price_source') || msg.includes('grant_price') || msg.includes('address') || msg.includes('property_type')))
  );
};

describe('Asset Repository Fallback Logic', () => {
  describe('stripOptionalColumnsForFallback', () => {
    it('should strip asset fields columns at assetFields level', () => {
      const dbInput = {
        name: 'Test',
        address: '123 Main St',
        property_type: 'House',
        grant_price: 100,
        last_price_fetched_at: '2024-01-01',
        price_source: 'manual',
        ticker: 'AAPL',
      };

      const result = stripOptionalColumnsForFallback(dbInput, 'assetFields');

      expect(result).toEqual({
        name: 'Test',
        last_price_fetched_at: '2024-01-01',
        price_source: 'manual',
        ticker: 'AAPL',
      });
      expect(result.address).toBeUndefined();
      expect(result.property_type).toBeUndefined();
      expect(result.grant_price).toBeUndefined();
    });

    it('should strip price and asset fields columns at priceFields level', () => {
      const dbInput = {
        name: 'Test',
        address: '123 Main St',
        property_type: 'House',
        grant_price: 100,
        last_price_fetched_at: '2024-01-01',
        price_source: 'manual',
        ticker: 'AAPL',
      };

      const result = stripOptionalColumnsForFallback(dbInput, 'priceFields');

      expect(result).toEqual({
        name: 'Test',
        ticker: 'AAPL',
      });
      expect(result.address).toBeUndefined();
      expect(result.property_type).toBeUndefined();
      expect(result.grant_price).toBeUndefined();
      expect(result.last_price_fetched_at).toBeUndefined();
      expect(result.price_source).toBeUndefined();
    });

    it('should strip all optional columns at basic level', () => {
      const dbInput = {
        name: 'Test',
        address: '123 Main St',
        property_type: 'House',
        grant_price: 100,
        last_price_fetched_at: '2024-01-01',
        price_source: 'manual',
        ticker: 'AAPL',
        exchange: 'NASDAQ',
        quantity: 10,
        purchase_price: 150,
        purchase_date: '2024-01-01',
        todays_price: 200,
        grant_date: '2024-01-01',
        vesting_date: '2024-01-01',
      };

      const result = stripOptionalColumnsForFallback(dbInput, 'basic');

      expect(result).toEqual({
        name: 'Test',
      });
      expect(result.address).toBeUndefined();
      expect(result.property_type).toBeUndefined();
      expect(result.grant_price).toBeUndefined();
      expect(result.last_price_fetched_at).toBeUndefined();
      expect(result.price_source).toBeUndefined();
      expect(result.ticker).toBeUndefined();
      expect(result.exchange).toBeUndefined();
      expect(result.quantity).toBeUndefined();
      expect(result.purchase_price).toBeUndefined();
      expect(result.purchase_date).toBeUndefined();
      expect(result.todays_price).toBeUndefined();
      expect(result.grant_date).toBeUndefined();
      expect(result.vesting_date).toBeUndefined();
    });
  });

  describe('isMissingColumnOrBadRequest', () => {
    it('should detect PGRST204 error', () => {
      const error = { code: 'PGRST204', message: 'column "address" does not exist' };
      expect(isMissingColumnOrBadRequest(error)).toBe(true);
    });

    it('should detect 42703 error', () => {
      const error = { code: '42703', message: 'column ticker does not exist' };
      expect(isMissingColumnOrBadRequest(error)).toBe(true);
    });

    it('should detect 400 status', () => {
      const error = { status: 400, message: 'bad request' };
      expect(isMissingColumnOrBadRequest(error)).toBe(true);
    });

    it('should not detect table missing error (42P01) as column error', () => {
      const error = { code: '42P01', message: 'relation "public.asset_value_history" does not exist' };
      expect(isMissingColumnOrBadRequest(error)).toBe(false);
    });

    it('should not detect other errors', () => {
      const error = { code: 'PGRST116', message: 'Asset not found' };
      expect(isMissingColumnOrBadRequest(error)).toBe(false);
    });
  });

  describe('getValueHistory error handling', () => {
    it('should identify table missing error', () => {
      const error = { code: '42P01', message: 'relation "public.asset_value_history" does not exist' };
      const code = error.code ?? '';
      const msg = (error.message ?? '').toLowerCase();
      const isTableMissing = code === '42P01' || msg.includes('relation') && msg.includes('does not exist');

      expect(isTableMissing).toBe(true);
    });

    it('should not identify other errors as table missing', () => {
      const error = { code: 'PGRST116', message: 'Asset not found' };
      const code = error.code ?? '';
      const msg = (error.message ?? '').toLowerCase();
      const isTableMissing = code === '42P01' || msg.includes('relation') && msg.includes('does not exist');

      expect(isTableMissing).toBe(false);
    });
  });
});