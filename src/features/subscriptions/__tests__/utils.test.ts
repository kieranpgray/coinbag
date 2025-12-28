import { describe, it, expect } from 'vitest';
import {
  isValidCurrencyAmount,
  isValidISODateString,
  isValidSubscriptionId,
  validateSubscriptionDates,
  validateSubscriptionAmount,
  validateSubscriptionIntegrity,
  calculateNextDueDate,
  calculateMonthlyEquivalent,
  SUBSCRIPTION_CATEGORIES,
  SUBSCRIPTION_FREQUENCIES,
} from '../utils';

describe('Subscription Utils', () => {
  describe('Type Guards', () => {
    describe('isValidCurrencyAmount', () => {
      it('returns true for valid amounts', () => {
        expect(isValidCurrencyAmount(10.99)).toBe(true);
        expect(isValidCurrencyAmount(100000)).toBe(true);
        expect(isValidCurrencyAmount(0.01)).toBe(true);
      });

      it('returns false for invalid amounts', () => {
        expect(isValidCurrencyAmount(0)).toBe(false);
        expect(isValidCurrencyAmount(-10)).toBe(false);
        expect(isValidCurrencyAmount(1000000.01)).toBe(false);
        expect(isValidCurrencyAmount(NaN)).toBe(false);
      });
    });

    describe('isValidISODateString', () => {
      it('returns true for valid ISO date strings', () => {
        expect(isValidISODateString('2024-01-15')).toBe(true);
        expect(isValidISODateString('2023-12-31')).toBe(true);
      });

      it('returns false for invalid date strings', () => {
        expect(isValidISODateString('2024-13-45')).toBe(false);
        expect(isValidISODateString('invalid')).toBe(false);
        expect(isValidISODateString('')).toBe(false);
      });
    });

    describe('isValidSubscriptionId', () => {
      it('returns true for valid subscription IDs', () => {
        expect(isValidSubscriptionId('123')).toBe(true);
        expect(isValidSubscriptionId('abc-def-ghi')).toBe(true);
      });

      it('returns false for invalid IDs', () => {
        expect(isValidSubscriptionId('')).toBe(false);
        expect(isValidSubscriptionId(null as unknown as string)).toBe(false);
      });
    });
  });

  describe('Business Logic Validation', () => {
    describe('validateSubscriptionDates', () => {
      it('returns true for valid date combinations', () => {
        expect(validateSubscriptionDates('2024-01-01', '2024-02-01')).toBe(true);
        expect(validateSubscriptionDates('2024-01-01', '2024-01-01')).toBe(true);
      });

      it('returns false for invalid date combinations', () => {
        expect(validateSubscriptionDates('2024-02-01', '2024-01-01')).toBe(false); // Next due before charge
        expect(validateSubscriptionDates('invalid', '2024-01-01')).toBe(false); // Invalid date
      });
    });

    describe('validateSubscriptionAmount', () => {
      it('returns true for valid amounts by frequency', () => {
        expect(validateSubscriptionAmount(10, 'weekly')).toBe(true);
        expect(validateSubscriptionAmount(50, 'monthly')).toBe(true);
        expect(validateSubscriptionAmount(1000, 'yearly')).toBe(true);
      });

      it('returns false for invalid amounts', () => {
        expect(validateSubscriptionAmount(0.5, 'weekly')).toBe(false); // Too low
        expect(validateSubscriptionAmount(3000, 'weekly')).toBe(false); // Too high
        expect(validateSubscriptionAmount(-10, 'monthly')).toBe(false); // Negative
      });
    });

    describe('validateSubscriptionIntegrity', () => {
      it('returns valid result for complete valid data', () => {
        const result = validateSubscriptionIntegrity({
          name: 'Netflix',
          amount: 15.99,
          frequency: 'monthly',
          chargeDate: '2024-01-01',
          nextDueDate: '2024-02-01',
          categoryId: '123e4567-e89b-12d3-a456-426614174111',
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('returns errors for invalid data', () => {
        const result = validateSubscriptionIntegrity({
          name: '',
          amount: -10,
          frequency: 'monthly',
          chargeDate: '2024-01-01',
          nextDueDate: '2023-01-01', // Before charge date
          categoryId: 'not-a-uuid',
        });

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Calculations', () => {
    describe('calculateNextDueDate', () => {
      it('calculates correct next due dates', () => {
        expect(calculateNextDueDate('2024-01-01', 'weekly')).toBe('2024-01-08');
        expect(calculateNextDueDate('2024-01-01', 'monthly')).toBe('2024-02-01');
        expect(calculateNextDueDate('2024-01-31', 'monthly')).toBe('2024-02-29'); // Handles leap year
        expect(calculateNextDueDate('2024-01-01', 'yearly')).toBe('2025-01-01');
      });
    });

    describe('calculateMonthlyEquivalent', () => {
      it('converts amounts to monthly equivalents', () => {
        expect(calculateMonthlyEquivalent(10, 'weekly')).toBeCloseTo(43.3, 1);
        expect(calculateMonthlyEquivalent(50, 'monthly')).toBe(50);
        expect(calculateMonthlyEquivalent(600, 'yearly')).toBe(50);
      });
    });
  });

  describe('Constants', () => {
    it('exports all subscription categories', () => {
      expect(SUBSCRIPTION_CATEGORIES).toContain('Entertainment');
      expect(SUBSCRIPTION_CATEGORIES).toContain('Utilities');
      expect(SUBSCRIPTION_CATEGORIES).toHaveLength(11);
    });

    it('exports all subscription frequencies', () => {
      expect(SUBSCRIPTION_FREQUENCIES).toContain('weekly');
      expect(SUBSCRIPTION_FREQUENCIES).toContain('monthly');
      expect(SUBSCRIPTION_FREQUENCIES).toHaveLength(4);
    });
  });
});
