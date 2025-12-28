import type { Income } from '@/types/domain';
import type { IncomeRepository } from './repo';
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
let incomes: Income[] = [];

/**
 * Helper function to seed mock income (for tests only)
 */
export function seedMockIncome(incs: Income[]): void {
  incomes = [...incs];
}

/**
 * Helper function to clear mock income (for tests)
 */
export function clearMockIncome(): void {
  incomes = [];
}

/**
 * Mock implementation of IncomeRepository
 */
export class MockIncomeRepository implements IncomeRepository {
  async list(_getToken?: () => Promise<string | null>) {
    await randomDelay();
    return {
      data: [...incomes],
      error: undefined,
    };
  }

  async get(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();
    const income = incomes.find((i) => i.id === id);
    if (!income) {
      return {
        error: {
          error: 'Income not found.',
          code: 'NOT_FOUND',
        },
      };
    }
    return { data: income };
  }

  async create(input: Omit<Income, 'id'>, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const newIncome: Income = {
      id: uuidv4(),
      ...input,
    };

    incomes.push(newIncome);
    return { data: newIncome };
  }

  async update(
    id: string,
    input: Partial<Omit<Income, 'id'>>,
    _getToken?: () => Promise<string | null>
  ) {
    await randomDelay();
    const index = incomes.findIndex((i) => i.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Income not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    const existing = incomes[index];
    if (!existing) {
      return {
        error: {
          error: 'Income not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    const updated: Income = {
      ...existing,
      ...input,
    };

    incomes[index] = updated;
    return { data: updated };
  }

  async remove(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();
    const index = incomes.findIndex((i) => i.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Income not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    incomes.splice(index, 1);
    return {};
  }
}

