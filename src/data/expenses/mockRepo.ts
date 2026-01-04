import type { Expense } from '@/types/domain';
import type { ExpensesRepository } from './repo';
import { ExpenseService } from '@/features/expenses/services/expenseService';
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
let expenses: Expense[] = [];

/**
 * Helper function to seed mock expenses (for tests only)
 */
export function seedMockExpenses(exps: Expense[]): void {
  expenses = [...exps];
}

/**
 * Helper function to clear mock expenses (for tests)
 */
export function clearMockExpenses(): void {
  expenses = [];
}

/**
 * Mock implementation of ExpensesRepository
 */
export class MockExpensesRepository implements ExpensesRepository {
  async list(_getToken?: () => Promise<string | null>) {
    await randomDelay();
    return {
      data: [...expenses],
      error: undefined,
    };
  }

  async get(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();
    const expense = expenses.find((e) => e.id === id);
    if (!expense) {
      return {
        error: {
          error: 'Expense not found.',
          code: 'NOT_FOUND',
        },
      };
    }
    return { data: expense };
  }

  async create(input: Omit<Expense, 'id'>, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    try {
      // Use service layer for business logic validation
      const validatedExpense = ExpenseService.createExpense(input);

      const newExpense: Expense = {
        id: uuidv4(),
        ...validatedExpense,
      };

      expenses.push(newExpense);
      return { data: newExpense };
    } catch (error) {
      // Re-throw with API-specific context
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to create expense.',
          code: 'VALIDATION_ERROR',
        },
      };
    }
  }

  async update(id: string, input: Partial<Omit<Expense, 'id'>>, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const index = expenses.findIndex((e) => e.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Expense not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    const existing = expenses[index];
    if (!existing) {
      return {
        error: {
          error: 'Expense not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    try {
      // Use service layer for business logic validation
      const validatedExpense = ExpenseService.updateExpense(existing, input);

      const updated: Expense = validatedExpense;
      expenses[index] = updated;
      return { data: updated };
    } catch (error) {
      // Re-throw with API-specific context
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to update expense.',
          code: 'VALIDATION_ERROR',
        },
      };
    }
  }

  async remove(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const index = expenses.findIndex((e) => e.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Expense not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    expenses.splice(index, 1);
    return {};
  }
}

