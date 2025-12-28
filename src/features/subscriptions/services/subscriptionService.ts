import type { Subscription, SubscriptionFrequency } from '@/types/domain';
import {
  validateSubscriptionIntegrity,
  calculateNextDueDate,
  calculateMonthlyEquivalent,
} from '../utils';

/**
 * Subscription business logic service
 * Handles domain operations and validations separate from API concerns
 */
export class SubscriptionService {
  /**
   * Create a new subscription with business rule validation
   */
  static createSubscription(data: {
    name: string;
    amount: number;
    frequency: SubscriptionFrequency;
    chargeDate: string;
    nextDueDate?: string; // Optional, will auto-calculate if not provided
    categoryId: string;
    notes?: string;
  }): Omit<Subscription, 'id'> {
    // Auto-calculate next due date if not provided
    const nextDueDate = data.nextDueDate || calculateNextDueDate(data.chargeDate, data.frequency);

    const subscriptionData = {
      name: data.name,
      amount: data.amount,
      frequency: data.frequency,
      chargeDate: data.chargeDate,
      nextDueDate,
      categoryId: data.categoryId,
      notes: data.notes,
    };

    // Validate business rules
    const validation = validateSubscriptionIntegrity(subscriptionData);
    if (!validation.isValid) {
      throw new Error(`Invalid subscription data: ${validation.errors.join(', ')}`);
    }

    // Return validated data (in real app, this would be persisted)
    return subscriptionData as Subscription;
  }

  /**
   * Update an existing subscription with validation
   */
  static updateSubscription(
    existing: Subscription,
    updates: Partial<{
      name: string;
      amount: number;
      frequency: SubscriptionFrequency;
      chargeDate: string;
      nextDueDate: string;
      categoryId: string;
      notes: string;
    }>
  ): Subscription {
    // Merge updates with existing data
    const updatedData = { ...existing, ...updates };

    // Auto-recalculate next due date if frequency or charge date changed
    if (updates.frequency || updates.chargeDate) {
      const chargeDate = updates.chargeDate || existing.chargeDate;
      const frequency = updates.frequency || existing.frequency;
      updatedData.nextDueDate = calculateNextDueDate(chargeDate, frequency);
    }

    // Validate updated data
    const validation = validateSubscriptionIntegrity(updatedData);
    if (!validation.isValid) {
      throw new Error(`Invalid subscription update: ${validation.errors.join(', ')}`);
    }

    return updatedData as Subscription;
  }

  /**
   * Calculate subscription analytics
   */
  static calculateAnalytics(subscriptions: Subscription[]) {
    const totalMonthly = subscriptions.reduce(
      (sum, sub) => sum + calculateMonthlyEquivalent(sub.amount, sub.frequency),
      0
    );

    // Note: This method now requires category resolution to work properly
    // The analytics should be updated to accept category data for name resolution
    const byCategory = subscriptions.reduce((acc, sub) => {
      const monthlyAmount = calculateMonthlyEquivalent(sub.amount, sub.frequency);
      // For now, use categoryId as key - this should be updated to resolve to category names
      acc[sub.categoryId] = (acc[sub.categoryId] || 0) + monthlyAmount;
      return acc;
    }, {} as Record<string, number>);

    const byFrequency = subscriptions.reduce((acc, sub) => {
      acc[sub.frequency] = (acc[sub.frequency] || 0) + 1;
      return acc;
    }, {} as Record<SubscriptionFrequency, number>);

    // Find subscriptions due soon (next 7 days)
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dueSoon = subscriptions.filter(sub => {
      const dueDate = new Date(sub.nextDueDate);
      return dueDate >= now && dueDate <= nextWeek;
    });

    return {
      totalSubscriptions: subscriptions.length,
      totalMonthlyAmount: Math.round(totalMonthly * 100) / 100,
      categoryBreakdown: byCategory,
      frequencyBreakdown: byFrequency,
      dueSoonCount: dueSoon.length,
      dueSoonSubscriptions: dueSoon,
    };
  }

  /**
   * Get subscription suggestions based on category
   * Note: This method returns category names, but the new system uses categoryIds.
   * Consider updating to return category IDs or providing a category resolver.
   */
  static getCategorySuggestions(): Array<{
    category: string; // Changed from SubscriptionCategory to string to work with category names
    commonServices: string[];
    averageMonthlyCost: number;
  }> {
    return [
      {
        category: 'Entertainment',
        commonServices: ['Netflix', 'Spotify', 'Disney+', 'Hulu'],
        averageMonthlyCost: 15,
      },
      {
        category: 'Software',
        commonServices: ['Adobe Creative Cloud', 'Microsoft 365', 'Figma'],
        averageMonthlyCost: 25,
      },
      {
        category: 'Cloud Storage',
        commonServices: ['Dropbox', 'Google Drive', 'iCloud'],
        averageMonthlyCost: 10,
      },
      {
        category: 'Utilities',
        commonServices: ['Internet', 'Phone', 'Electricity'],
        averageMonthlyCost: 80,
      },
    ];
  }

  /**
   * Validate and normalize subscription data
   */
  static normalizeSubscription(data: unknown): Subscription | null {
    try {
      if (!data || typeof data !== 'object') return null;

      const obj = data as Record<string, unknown>;
      const normalized = {
        name: String(obj.name || '').trim(),
        amount: Number(obj.amount) || 0,
        frequency: obj.frequency as SubscriptionFrequency,
        chargeDate: String(obj.chargeDate || ''),
        nextDueDate: String(obj.nextDueDate || ''),
        categoryId: String(obj.categoryId || ''),
        notes: obj.notes ? String(obj.notes).trim() : undefined,
      };

      const validation = validateSubscriptionIntegrity(normalized);
      return validation.isValid ? (normalized as Subscription) : null;
    } catch (error) {
      console.warn('Failed to normalize subscription data:', error);
      return null;
    }
  }
}
