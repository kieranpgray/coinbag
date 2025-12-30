import type { Liability } from '@/types/domain';
import type { LiabilitiesRepository } from './repo';
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
let liabilities: Liability[] = [];

/**
 * Helper function to seed mock liabilities (for tests only)
 */
export function seedMockLiabilities(liabs: Liability[]): void {
  liabilities = [...liabs];
}

/**
 * Helper function to clear mock liabilities (for tests)
 */
export function clearMockLiabilities(): void {
  liabilities = [];
}

/**
 * Mock implementation of LiabilitiesRepository
 */
export class MockLiabilitiesRepository implements LiabilitiesRepository {
  async list(_getToken?: () => Promise<string | null>) {
    await randomDelay();
    return {
      data: [...liabilities],
      error: undefined,
    };
  }

  async get(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();
    const liability = liabilities.find((l) => l.id === id);
    if (!liability) {
      return {
        error: {
          error: 'Liability not found.',
          code: 'NOT_FOUND',
        },
      };
    }
    return { data: liability };
  }

  async create(input: Omit<Liability, 'id'>, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const newLiability: Liability = {
      id: uuidv4(),
      ...input,
    };

    liabilities.push(newLiability);
    return { data: newLiability };
  }

  async update(id: string, input: Partial<Omit<Liability, 'id'>>, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const index = liabilities.findIndex((l) => l.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Liability not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    const existing = liabilities[index];
    if (!existing) {
      return {
        error: {
          error: 'Liability not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    const updated: Liability = {
      id: existing.id,
      name: input.name ?? existing.name,
      type: input.type ?? existing.type,
      balance: input.balance ?? existing.balance,
      interestRate: input.interestRate ?? existing.interestRate,
      monthlyPayment: input.monthlyPayment ?? existing.monthlyPayment,
      dueDate: input.dueDate ?? existing.dueDate,
      institution: input.institution ?? existing.institution,
      repaymentAmount: input.repaymentAmount ?? existing.repaymentAmount,
      repaymentFrequency: input.repaymentFrequency ?? existing.repaymentFrequency,
    };

    liabilities[index] = updated;
    return { data: updated };
  }

  async remove(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const index = liabilities.findIndex((l) => l.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Liability not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    liabilities.splice(index, 1);
    return {};
  }
}
