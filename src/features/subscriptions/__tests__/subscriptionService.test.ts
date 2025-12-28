import { describe, it, expect, vi } from 'vitest';
import { SubscriptionService } from '../services/subscriptionService';
import type { Subscription } from '@/types/domain';

// Mock the utils functions
vi.mock('../utils', () => ({
  validateSubscriptionIntegrity: vi.fn(),
  calculateNextDueDate: vi.fn(),
  calculateMonthlyEquivalent: vi.fn(),
}));

// Import the mocked functions for use in tests
const {
  validateSubscriptionIntegrity,
  calculateNextDueDate,
  calculateMonthlyEquivalent,
} = await import('../utils');

describe('SubscriptionService', () => {
  describe('createSubscription', () => {
    it('creates a subscription with valid data', () => {
      validateSubscriptionIntegrity.mockReturnValue({ isValid: true, errors: [] });
      calculateNextDueDate.mockReturnValue('2024-02-01');

      const data = {
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly' as const,
        chargeDate: '2024-01-01',
        categoryId: '123e4567-e89b-12d3-a456-426614174111',
        notes: 'Streaming service',
      };

      const result = SubscriptionService.createSubscription(data);

      expect(result.name).toBe('Netflix');
      expect(result.amount).toBe(15.99);
      expect(calculateNextDueDate).toHaveBeenCalledWith('2024-01-01', 'monthly');
      expect(validateSubscriptionIntegrity).toHaveBeenCalledWith({
        ...data,
        nextDueDate: '2024-02-01',
      });
    });

    it('throws error for invalid data', () => {
      validateSubscriptionIntegrity.mockReturnValue({
        isValid: false,
        errors: ['Invalid amount', 'Invalid dates']
      });

      expect(() => {
        SubscriptionService.createSubscription({
          name: 'Test',
          amount: -10,
          frequency: 'monthly' as const,
          chargeDate: '2024-01-01',
          categoryId: '123e4567-e89b-12d3-a456-426614174111',
        });
      }).toThrow('Invalid subscription data: Invalid amount, Invalid dates');
    });
  });

  describe('updateSubscription', () => {
    const existingSubscription: Subscription = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Netflix',
      amount: 15.99,
      frequency: 'monthly',
      chargeDate: '2024-01-01',
      nextDueDate: '2024-02-01',
      categoryId: '123e4567-e89b-12d3-a456-426614174111',
    };

    it('updates subscription with valid changes', () => {
      validateSubscriptionIntegrity.mockReturnValue({ isValid: true, errors: [] });

      const updates = { name: 'Netflix Premium', amount: 19.99 };

      const result = SubscriptionService.updateSubscription(existingSubscription, updates);

      expect(result.name).toBe('Netflix Premium');
      expect(result.amount).toBe(19.99);
      expect(validateSubscriptionIntegrity).toHaveBeenCalled();
    });

    it('auto-calculates next due date when frequency changes', () => {
      validateSubscriptionIntegrity.mockReturnValue({ isValid: true, errors: [] });
      calculateNextDueDate.mockReturnValue('2024-01-08');

      const result = SubscriptionService.updateSubscription(existingSubscription, {
        frequency: 'weekly',
      });

      expect(calculateNextDueDate).toHaveBeenCalledWith('2024-01-01', 'weekly');
      expect(result.nextDueDate).toBe('2024-01-08');
    });
  });

  describe('calculateAnalytics', () => {
    const subscriptions: Subscription[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        chargeDate: '2024-01-01',
        nextDueDate: '2024-02-01',
        categoryId: '123e4567-e89b-12d3-a456-426614174111',
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        name: 'Gym',
        amount: 50,
        frequency: 'monthly',
        chargeDate: '2024-01-01',
        nextDueDate: '2024-02-01',
        categoryId: '123e4567-e89b-12d3-a456-426614174222',
      },
    ];

    it('calculates total monthly amount correctly', () => {
      calculateMonthlyEquivalent.mockImplementation((amount: number, _freq: unknown) => amount); // Mock as identity for simplicity

      const analytics = SubscriptionService.calculateAnalytics(subscriptions);

      expect(analytics.totalMonthlyAmount).toBe(65.99);
      expect(analytics.totalSubscriptions).toBe(2);
    });

    it('groups subscriptions by category', () => {
      calculateMonthlyEquivalent.mockImplementation((amount: number, _freq: unknown) => amount);

      const analytics = SubscriptionService.calculateAnalytics(subscriptions);

      expect(analytics.categoryBreakdown[subscriptions[0]!.categoryId]).toBe(15.99);
      expect(analytics.categoryBreakdown[subscriptions[1]!.categoryId]).toBe(50);
    });
  });

  describe('getCategorySuggestions', () => {
    it('returns category suggestions with common services', () => {
      const suggestions = SubscriptionService.getCategorySuggestions();

      expect(suggestions).toHaveLength(4);
      expect(suggestions[0]).toHaveProperty('category');
      expect(suggestions[0]).toHaveProperty('commonServices');
      expect(suggestions[0]).toHaveProperty('averageMonthlyCost');
    });
  });

  describe('normalizeSubscription', () => {
    it('normalizes valid subscription data', () => {
      validateSubscriptionIntegrity.mockReturnValue({ isValid: true, errors: [] });

      const data = {
        name: '  Netflix  ',
        amount: '15.99',
        frequency: 'monthly',
        chargeDate: '2024-01-01',
        nextDueDate: '2024-02-01',
        categoryId: '123e4567-e89b-12d3-a456-426614174111',
      };

      const result = SubscriptionService.normalizeSubscription(data);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Netflix');
      expect(result?.amount).toBe(15.99);
    });

    it('returns null for invalid data', () => {
      const result = SubscriptionService.normalizeSubscription(null);
      expect(result).toBeNull();
    });
  });
});
