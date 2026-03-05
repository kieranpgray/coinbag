import { describe, it, expect } from 'vitest';
import { accountCreateSchema } from '../accounts';

describe('accountCreateSchema', () => {
  const baseValidData = {
    accountName: 'Test Account',
    accountType: 'Bank Account' as const,
    lastUpdated: new Date().toISOString(),
    hidden: false,
  };

  describe('balance field', () => {
    it('accepts blank balance and defaults to 0', () => {
      const result = accountCreateSchema.safeParse({
        ...baseValidData,
        balance: undefined,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.balance).toBe(0);
      }
    });

    it('accepts empty string balance and defaults to 0', () => {
      const result = accountCreateSchema.safeParse({
        ...baseValidData,
        balance: '',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.balance).toBe(0);
      }
    });

    it('accepts explicit 0 balance', () => {
      const result = accountCreateSchema.safeParse({
        ...baseValidData,
        balance: 0,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.balance).toBe(0);
      }
    });

    it('accepts positive decimal balance', () => {
      const result = accountCreateSchema.safeParse({
        ...baseValidData,
        balance: 125.75,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.balance).toBe(125.75);
      }
    });
  });

  describe('institution field', () => {
    it('accepts blank institution (undefined)', () => {
      const result = accountCreateSchema.safeParse({
        ...baseValidData,
        balance: 100,
        institution: undefined,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.institution).toBeUndefined();
      }
    });

    it('accepts empty string institution', () => {
      const result = accountCreateSchema.safeParse({
        ...baseValidData,
        balance: 100,
        institution: '',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.institution).toBeUndefined();
      }
    });

    it('accepts valid institution', () => {
      const result = accountCreateSchema.safeParse({
        ...baseValidData,
        balance: 100,
        institution: 'ANZ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.institution).toBe('ANZ');
      }
    });
  });

  describe('blank balance and blank institution together', () => {
    it('creates valid account with both optional fields blank', () => {
      const result = accountCreateSchema.safeParse({
        ...baseValidData,
        balance: undefined,
        institution: undefined,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.balance).toBe(0);
        expect(result.data.institution).toBeUndefined();
      }
    });
  });
});
