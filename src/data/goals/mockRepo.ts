import type { Goal } from '@/types/domain';
import type { GoalsRepository } from './repo';
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
let goals: Goal[] = [];

/**
 * Helper function to seed mock goals (for tests only)
 */
export function seedMockGoals(gls: Goal[]): void {
  goals = [...gls];
}

/**
 * Helper function to clear mock goals (for tests)
 */
export function clearMockGoals(): void {
  goals = [];
}

/**
 * Mock implementation of GoalsRepository
 */
export class MockGoalsRepository implements GoalsRepository {
  async list(_getToken?: () => Promise<string | null>) {
    await randomDelay();
    return {
      data: [...goals],
      error: undefined,
    };
  }

  async get(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();
    const goal = goals.find((g) => g.id === id);
    if (!goal) {
      return {
        error: {
          error: 'Goal not found.',
          code: 'NOT_FOUND',
        },
      };
    }
    return { data: goal };
  }

  async create(input: Omit<Goal, 'id'>, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const newGoal: Goal = {
      id: uuidv4(),
      ...input,
    };

    goals.push(newGoal);
    return { data: newGoal };
  }

  async update(id: string, input: Partial<Omit<Goal, 'id'>>, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const index = goals.findIndex((g) => g.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Goal not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    const existing = goals[index];
    if (!existing) {
      return {
        error: {
          error: 'Goal not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    const updated: Goal = {
      id: existing.id,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      source: input.source ?? existing.source,
      accountId: input.accountId ?? existing.accountId,
      targetAmount: input.targetAmount ?? existing.targetAmount,
      currentAmount: input.currentAmount ?? existing.currentAmount,
      deadline: input.deadline ?? existing.deadline,
      status: input.status ?? existing.status,
    };

    goals[index] = updated;
    return { data: updated };
  }

  async remove(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const index = goals.findIndex((g) => g.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Goal not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    goals.splice(index, 1);
    return {};
  }
}
