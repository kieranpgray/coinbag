import { describe, it, expect } from 'vitest';
import {
  subscriptionEntitySchema,
  subscriptionCreateSchema,
  subscriptionUpdateSchema,
  subscriptionListSchema,
  subscriptionIdSchema,
} from '../subscriptionsOrExpenses';

describe('Subscription Contracts', () => {
  const validSubscription = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Netflix Subscription',
    amount: 15.99,
    frequency: 'monthly' as const,
    chargeDate: '2024-01-01',
    nextDueDate: '2024-02-01',
    categoryId: '123e4567-e89b-12d3-a456-426614174111',
    notes: 'Streaming service',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('subscriptionEntitySchema', () => {
    it('validates a complete subscription entity', () => {
      const result = subscriptionEntitySchema.safeParse(validSubscription);
      expect(result.success).toBe(true);
      // Note: created_at and updated_at are auto-generated, so they won't be in the parsed result
      // if they're not explicitly defined in the schema
      expect(result.data).toMatchObject({
        id: validSubscription.id,
        name: validSubscription.name,
        amount: validSubscription.amount,
        frequency: validSubscription.frequency,
        chargeDate: validSubscription.chargeDate,
        nextDueDate: validSubscription.nextDueDate,
        categoryId: validSubscription.categoryId,
        notes: validSubscription.notes,
      });
    });

    it('requires all mandatory fields', () => {
      const invalidSubscription = {
        name: 'Test Subscription',
        // Missing required fields
      };

      const result = subscriptionEntitySchema.safeParse(invalidSubscription);
      expect(result.success).toBe(false);
    });

    it('validates UUID format for id', () => {
      const invalidId = {
        ...validSubscription,
        id: 'invalid-id',
      };

      const result = subscriptionEntitySchema.safeParse(invalidId);
      expect(result.success).toBe(false);
    });

    it('validates frequency enum values', () => {
      const invalidFrequency = {
        ...validSubscription,
        frequency: 'invalid' as unknown as typeof validSubscription.frequency,
      };

      const result = subscriptionEntitySchema.safeParse(invalidFrequency);
      expect(result.success).toBe(false);
    });

    it('validates categoryId format', () => {
      const invalidCategoryId = {
        ...validSubscription,
        categoryId: 'not-a-uuid',
      };

      const result = subscriptionEntitySchema.safeParse(invalidCategoryId);
      expect(result.success).toBe(false);
    });

    it('validates amount constraints', () => {
      const negativeAmount = {
        ...validSubscription,
        amount: -10,
      };

      const result = subscriptionEntitySchema.safeParse(negativeAmount);
      expect(result.success).toBe(false);
    });

    it('validates date formats', () => {
      const invalidDate = {
        ...validSubscription,
        chargeDate: 'invalid-date',
      };

      const result = subscriptionEntitySchema.safeParse(invalidDate);
      expect(result.success).toBe(false);
    });

    it('validates next due date is after charge date', () => {
      const invalidDates = {
        ...validSubscription,
        chargeDate: '2024-02-01',
        nextDueDate: '2024-01-01', // Before charge date
      };

      const result = subscriptionEntitySchema.safeParse(invalidDates);
      expect(result.success).toBe(false);
    });

    it('validates amount ranges by frequency', () => {
      const tooLowWeekly = {
        ...validSubscription,
        frequency: 'weekly' as const,
        amount: 0.5, // Below minimum for weekly
      };

      const result = subscriptionEntitySchema.safeParse(tooLowWeekly);
      expect(result.success).toBe(false);
    });

    it('allows optional notes', () => {
      const withoutNotes = {
        ...validSubscription,
        notes: undefined,
      };

      const result = subscriptionEntitySchema.safeParse(withoutNotes);
      expect(result.success).toBe(true);
    });
  });

  describe('subscriptionCreateSchema', () => {
    it('validates create input without id', () => {
      const createInput = {
        name: 'Spotify Subscription',
        amount: 9.99,
        frequency: 'monthly' as const,
        chargeDate: '2024-01-01',
        nextDueDate: '2024-02-01',
        categoryId: validSubscription.categoryId,
        notes: 'Music streaming',
      };

      const result = subscriptionCreateSchema.safeParse(createInput);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(createInput);
    });

    it('accepts create input without id', () => {
      const createInput = {
        name: validSubscription.name,
        amount: validSubscription.amount,
        frequency: validSubscription.frequency,
        chargeDate: validSubscription.chargeDate,
        nextDueDate: validSubscription.nextDueDate,
        categoryId: validSubscription.categoryId,
        notes: validSubscription.notes,
      };

      const result = subscriptionCreateSchema.safeParse(createInput);
      expect(result.success).toBe(true);
    });
  });

  describe('subscriptionUpdateSchema', () => {
    it('validates partial update input without id', () => {
      const updateInput = {
        name: 'Updated Name',
        amount: 19.99,
      };

      const result = subscriptionUpdateSchema.safeParse(updateInput);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updateInput);
    });

    it('allows partial updates with any combination of fields', () => {
      const updateWithoutId = {
        name: 'Updated Name',
      };

      const result = subscriptionUpdateSchema.safeParse(updateWithoutId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updateWithoutId);
    });
  });

  describe('subscriptionListSchema', () => {
    it('validates array of subscriptions', () => {
      const subscriptionList = [validSubscription];

      const result = subscriptionListSchema.safeParse(subscriptionList);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: validSubscription.id,
        name: validSubscription.name,
        amount: validSubscription.amount,
        frequency: validSubscription.frequency,
        chargeDate: validSubscription.chargeDate,
        nextDueDate: validSubscription.nextDueDate,
        categoryId: validSubscription.categoryId,
        notes: validSubscription.notes,
      });
    });

    it('validates empty array', () => {
      const emptyList: unknown[] = [];

      const result = subscriptionListSchema.safeParse(emptyList);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('rejects invalid subscription in array', () => {
      const invalidList = [
        validSubscription,
        { name: 'Invalid' }, // Missing required fields
      ];

      const result = subscriptionListSchema.safeParse(invalidList);
      expect(result.success).toBe(false);
    });
  });

  describe('subscriptionIdSchema', () => {
    it('validates UUID string', () => {
      const idInput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = subscriptionIdSchema.safeParse(idInput);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(idInput);
    });

    it('rejects invalid UUID', () => {
      const invalidId = {
        id: 'not-a-uuid',
      };

      const result = subscriptionIdSchema.safeParse(invalidId);
      expect(result.success).toBe(false);
    });
  });

  describe('Business Logic Validation', () => {
    it('validates realistic subscription scenarios', () => {
      const scenarios = [
        {
          name: 'Monthly streaming service',
          amount: 15.99,
          frequency: 'monthly' as const,
          chargeDate: '2024-01-15',
          nextDueDate: '2024-02-15',
          categoryId: validSubscription.categoryId,
        },
        {
          name: 'Annual insurance',
          amount: 1200,
          frequency: 'yearly' as const,
          chargeDate: '2024-03-01',
          nextDueDate: '2025-03-01',
          categoryId: validSubscription.categoryId,
        },
        {
          name: 'Weekly meal service',
          amount: 45,
          frequency: 'weekly' as const,
          chargeDate: '2024-01-08',
          nextDueDate: '2024-01-15',
          categoryId: validSubscription.categoryId,
        },
      ];

      scenarios.forEach((scenario) => {
        const result = subscriptionCreateSchema.safeParse(scenario);
        expect(result.success).toBe(true);
      });
    });
  });
});
