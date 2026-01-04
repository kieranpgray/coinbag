import type { Account } from '@/types/domain';
import type { AccountsRepository } from './repo';
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
let accounts: Account[] = [];

/**
 * Helper function to seed mock accounts (for tests only)
 */
export function seedMockAccounts(accs: Account[]): void {
  accounts = [...accs];
}

/**
 * Helper function to clear mock accounts (for tests)
 */
export function clearMockAccounts(): void {
  accounts = [];
}

/**
 * Mock implementation of AccountsRepository
 */
export class MockAccountsRepository implements AccountsRepository {
  async list(_getToken?: () => Promise<string | null>) {
    await randomDelay();
    return {
      data: [...accounts],
      error: undefined,
    };
  }

  async get(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();
    const account = accounts.find((a) => a.id === id);
    if (!account) {
      return {
        error: {
          error: 'Account not found.',
          code: 'NOT_FOUND',
        },
      };
    }
    return { data: account };
  }

  async create(input: Omit<Account, 'id'>, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const newAccount: Account = {
      id: uuidv4(),
      ...input,
    };

    accounts.push(newAccount);
    return { data: newAccount };
  }

  async update(id: string, input: Partial<Omit<Account, 'id'>>, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const index = accounts.findIndex((a) => a.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Account not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    const existing = accounts[index];
    if (!existing) {
      return {
        error: {
          error: 'Account not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    const updated: Account = {
      id: existing.id,
      institution: input.institution ?? existing.institution,
      accountName: input.accountName ?? existing.accountName,
      balance: input.balance ?? existing.balance,
      accountType: input.accountType ?? existing.accountType,
      creditLimit: input.creditLimit ?? existing.creditLimit,
      balanceOwed: input.balanceOwed ?? existing.balanceOwed,
      lastUpdated: input.lastUpdated ?? existing.lastUpdated,
      hidden: input.hidden ?? existing.hidden,
    };

    accounts[index] = updated;
    return { data: updated };
  }

  async remove(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const index = accounts.findIndex((a) => a.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Account not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    accounts.splice(index, 1);
    return {};
  }
}
