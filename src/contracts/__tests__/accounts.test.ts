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

  describe('credit account fields (Credit Card & Loan)', () => {
    const baseCreditData = {
      accountName: 'Test Card',
      balance: 0,
      lastUpdated: new Date().toISOString(),
      hidden: false,
    };

    it('accepts Loan with both creditLimit and balanceOwed undefined', () => {
      const result = accountCreateSchema.safeParse({
        ...baseCreditData,
        accountType: 'Loan',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.creditLimit).toBeUndefined();
        expect(result.data.balanceOwed).toBeUndefined();
      }
    });

    it('accepts Loan with only creditLimit provided', () => {
      const result = accountCreateSchema.safeParse({
        ...baseCreditData,
        accountType: 'Loan',
        creditLimit: 10000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.creditLimit).toBe(10000);
        expect(result.data.balanceOwed).toBeUndefined();
      }
    });

    it('accepts Loan with only balanceOwed provided', () => {
      const result = accountCreateSchema.safeParse({
        ...baseCreditData,
        accountType: 'Loan',
        balanceOwed: 5000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.creditLimit).toBeUndefined();
        expect(result.data.balanceOwed).toBe(5000);
      }
    });

    it('accepts Credit Card with both undefined', () => {
      const result = accountCreateSchema.safeParse({
        ...baseCreditData,
        accountType: 'Credit Card',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.creditLimit).toBeUndefined();
        expect(result.data.balanceOwed).toBeUndefined();
      }
    });

    it('accepts Credit Card with only creditLimit provided', () => {
      const result = accountCreateSchema.safeParse({
        ...baseCreditData,
        accountType: 'Credit Card',
        creditLimit: 5000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.creditLimit).toBe(5000);
        expect(result.data.balanceOwed).toBeUndefined();
      }
    });

    it('accepts Credit Card with both provided', () => {
      const result = accountCreateSchema.safeParse({
        ...baseCreditData,
        accountType: 'Credit Card',
        creditLimit: 10000,
        balanceOwed: 2000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.creditLimit).toBe(10000);
        expect(result.data.balanceOwed).toBe(2000);
      }
    });
  });
});
