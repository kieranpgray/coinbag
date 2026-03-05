import { describe, it, expect } from 'vitest';
import {
  getExpenseType,
  getExpenseTypesFromExpenses,
  getExpenseTypeTotals,
} from '../expenseTypeMapping';

describe('expenseTypeMapping', () => {
  describe('getExpenseType', () => {
    it('returns "other" for empty string', () => {
      expect(getExpenseType('')).toBe('other');
    });

    it('returns "other" for single-char input to avoid over-matching', () => {
      expect(getExpenseType('a')).toBe('other');
      expect(getExpenseType('x')).toBe('other');
    });

    it('returns "other" for unmatched category names', () => {
      expect(getExpenseType('Unknown Category')).toBe('other');
      expect(getExpenseType('Pet Supplies')).toBe('other');
      expect(getExpenseType('Side Hustle Costs')).toBe('other');
      expect(getExpenseType('Spotify')).toBe('other');
    });

    it('returns "health" for health-related categories', () => {
      expect(getExpenseType('Gym Membership')).toBe('health');
      expect(getExpenseType('Health')).toBe('health');
      expect(getExpenseType('Medical')).toBe('health');
      expect(getExpenseType('Pharmacy')).toBe('health');
      expect(getExpenseType('Medicine / Pharmacy')).toBe('health');
      expect(getExpenseType('Fitness / Gym')).toBe('health');
    });

    it('returns "other" for "Other" and "Uncategorised"', () => {
      expect(getExpenseType('Other')).toBe('other');
      expect(getExpenseType('Uncategorised')).toBe('other');
    });

    it('partial match order: "Other Insurance" → bills, "Other" → other', () => {
      expect(getExpenseType('Other Insurance')).toBe('bills');
      expect(getExpenseType('Other')).toBe('other');
    });
  });

  describe('getExpenseTypesFromExpenses', () => {
    it('includes "other" when expense has deprecated category not in categoryMap', () => {
      const expenses = [
        { categoryId: 'deprecated-uuid-not-in-map' },
      ];
      const categoryMap = new Map<string, string>();
      const result = getExpenseTypesFromExpenses(expenses, categoryMap, undefined);

      expect(result).toContain('other');
    });

    it('includes "other" when expense has explicit Uncategorised category', () => {
      const uncategorisedId = 'uncategorised-uuid';
      const expenses = [{ categoryId: uncategorisedId }];
      const categoryMap = new Map<string, string>([[uncategorisedId, 'Uncategorised']]);

      const result = getExpenseTypesFromExpenses(expenses, categoryMap, uncategorisedId);

      expect(result).toContain('other');
    });
  });

  describe('getExpenseTypeTotals', () => {
    it('counts deprecated-category expense under "other" total', () => {
      const deprecatedId = 'deprecated-uuid-not-in-map';
      const expenses = [
        {
          categoryId: deprecatedId,
          amount: 100,
          frequency: 'monthly',
        },
      ];
      const categoryMap = new Map<string, string>();
      const calculateMonthlyEquivalent = (amount: number, _freq: string) => amount;

      const result = getExpenseTypeTotals(
        expenses,
        categoryMap,
        undefined,
        calculateMonthlyEquivalent
      );

      expect(result.other).toBe(100);
    });
  });
});
