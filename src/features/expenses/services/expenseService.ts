import type { Expense, ExpenseFrequency } from '@/types/domain';
import {
  validateExpenseIntegrity,
  calculateNextDueDate,
  calculateMonthlyEquivalent,
} from '../utils';

/**
 * Expense business logic service
 * Handles domain operations and validations separate from API concerns
 */
export class ExpenseService {
  /**
   * Create a new expense with business rule validation
   */
  static createExpense(data: {
    name: string;
    amount: number;
    frequency: ExpenseFrequency;
    chargeDate: string;
    nextDueDate?: string; // Optional, will auto-calculate if not provided
    categoryId: string;
    notes?: string;
  }): Omit<Expense, 'id'> {
    // Auto-calculate next due date if not provided
    const nextDueDate = data.nextDueDate || calculateNextDueDate(data.chargeDate, data.frequency);

    const expenseData = {
      name: data.name,
      amount: data.amount,
      frequency: data.frequency,
      chargeDate: data.chargeDate,
      nextDueDate,
      categoryId: data.categoryId,
      notes: data.notes,
    };

    // Validate business rules
    const validation = validateExpenseIntegrity(expenseData);
    if (!validation.isValid) {
      throw new Error(`Invalid expense data: ${validation.errors.join(', ')}`);
    }

    // Return validated data (in real app, this would be persisted)
    return expenseData as Expense;
  }

  /**
   * Update an existing expense with validation
   */
  static updateExpense(
    existing: Expense,
    updates: Partial<{
      name: string;
      amount: number;
      frequency: ExpenseFrequency;
      chargeDate: string;
      nextDueDate: string;
      categoryId: string;
      notes: string;
    }>
  ): Expense {
    // Merge updates with existing data
    const updatedData = { ...existing, ...updates };

    // Auto-recalculate next due date if frequency or charge date changed
    if (updates.frequency || updates.chargeDate) {
      const chargeDate = updates.chargeDate || existing.chargeDate;
      const frequency = updates.frequency || existing.frequency;
      updatedData.nextDueDate = calculateNextDueDate(chargeDate, frequency);
    }

    // Validate updated data
    const validation = validateExpenseIntegrity(updatedData);
    if (!validation.isValid) {
      throw new Error(`Invalid expense update: ${validation.errors.join(', ')}`);
    }

    return updatedData as Expense;
  }

  /**
   * Calculate expense analytics
   */
  static calculateAnalytics(expenses: Expense[]) {
    const totalMonthly = expenses.reduce(
      (sum, exp) => sum + calculateMonthlyEquivalent(exp.amount, exp.frequency),
      0
    );

    // Note: This method now requires category resolution to work properly
    // The analytics should be updated to accept category data for name resolution
    const byCategory = expenses.reduce((acc, exp) => {
      const monthlyAmount = calculateMonthlyEquivalent(exp.amount, exp.frequency);
      // For now, use categoryId as key - this should be updated to resolve to category names
      acc[exp.categoryId] = (acc[exp.categoryId] || 0) + monthlyAmount;
      return acc;
    }, {} as Record<string, number>);

    const byFrequency = expenses.reduce((acc, exp) => {
      acc[exp.frequency] = (acc[exp.frequency] || 0) + 1;
      return acc;
    }, {} as Record<ExpenseFrequency, number>);

    // Find expenses due soon (next 7 days)
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dueSoon = expenses.filter(exp => {
      const dueDate = new Date(exp.nextDueDate);
      return dueDate >= now && dueDate <= nextWeek;
    });

    return {
      totalExpenses: expenses.length,
      totalMonthlyAmount: Math.round(totalMonthly * 100) / 100,
      categoryBreakdown: byCategory,
      frequencyBreakdown: byFrequency,
      dueSoonCount: dueSoon.length,
      dueSoonExpenses: dueSoon,
    };
  }

  /**
   * Get expense suggestions based on category
   * Note: This method returns category names, but the new system uses categoryIds.
   * Consider updating to return category IDs or providing a category resolver.
   */
  static getCategorySuggestions(): Array<{
    category: string; // Changed from ExpenseCategory to string to work with category names
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
   * Validate and normalize expense data
   */
  static normalizeExpense(data: unknown): Expense | null {
    try {
      if (!data || typeof data !== 'object') return null;

      const obj = data as Record<string, unknown>;
      const normalized = {
        name: String(obj.name || '').trim(),
        amount: Number(obj.amount) || 0,
        frequency: obj.frequency as ExpenseFrequency,
        chargeDate: String(obj.chargeDate || ''),
        nextDueDate: String(obj.nextDueDate || ''),
        categoryId: String(obj.categoryId || ''),
        notes: obj.notes ? String(obj.notes).trim() : undefined,
      };

      const validation = validateExpenseIntegrity(normalized);
      return validation.isValid ? (normalized as Expense) : null;
    } catch (error) {
      console.warn('Failed to normalize expense data:', error);
      return null;
    }
  }
}

// Backward compatibility exports
/** @deprecated Use ExpenseService instead */
export const SubscriptionService = ExpenseService;

