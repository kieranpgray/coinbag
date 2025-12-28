import type { Subscription } from '@/types/domain';
import type { SubscriptionsRepository } from './repo';
import { SubscriptionService } from '@/features/subscriptions/services/subscriptionService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Simulate API delay
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Random delay between 50-200ms for realistic simulation
 */
const randomDelay = () => delay(Math.floor(Math.random() * 150) + 50);

// In-memory data store (no auto-seeding)
let subscriptions: Subscription[] = [];

/**
 * Helper function to seed mock subscriptions (for tests only)
 */
export function seedMockSubscriptions(subs: Subscription[]): void {
  subscriptions = [...subs];
}

/**
 * Helper function to clear mock subscriptions (for tests)
 */
export function clearMockSubscriptions(): void {
  subscriptions = [];
}

/**
 * Mock implementation of SubscriptionsRepository
 */
export class MockSubscriptionsRepository implements SubscriptionsRepository {
  async list(_getToken?: () => Promise<string | null>) {
    await randomDelay();
    return {
      data: [...subscriptions],
      error: undefined,
    };
  }

  async get(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();
    const subscription = subscriptions.find((s) => s.id === id);
    if (!subscription) {
      return {
        error: {
          error: 'Subscription not found.',
          code: 'NOT_FOUND',
        },
      };
    }
    return { data: subscription };
  }

  async create(input: Omit<Subscription, 'id'>, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    try {
      // Use service layer for business logic validation
      const validatedSubscription = SubscriptionService.createSubscription(input);

      const newSubscription: Subscription = {
        id: uuidv4(),
        ...validatedSubscription,
      };

      subscriptions.push(newSubscription);
      return { data: newSubscription };
    } catch (error) {
      // Re-throw with API-specific context
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to create subscription.',
          code: 'VALIDATION_ERROR',
        },
      };
    }
  }

  async update(id: string, input: Partial<Omit<Subscription, 'id'>>, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const index = subscriptions.findIndex((s) => s.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Subscription not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    const existing = subscriptions[index];
    if (!existing) {
      return {
        error: {
          error: 'Subscription not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    try {
      // Use service layer for business logic validation
      const validatedSubscription = SubscriptionService.updateSubscription(existing, input);

      const updated: Subscription = validatedSubscription;
      subscriptions[index] = updated;
      return { data: updated };
    } catch (error) {
      // Re-throw with API-specific context
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to update subscription.',
          code: 'VALIDATION_ERROR',
        },
      };
    }
  }

  async remove(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const index = subscriptions.findIndex((s) => s.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Subscription not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    subscriptions.splice(index, 1);
    return {};
  }
}
