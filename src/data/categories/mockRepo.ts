import type { Category } from '@/types/domain';
import type { CategoriesRepository } from './repo';
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
let categories: Category[] = [];

/**
 * Helper function to seed mock categories (for tests only)
 */
export function seedMockCategories(cats: Category[]): void {
  categories = [...cats];
}

/**
 * Helper function to clear mock categories (for tests)
 */
export function clearMockCategories(): void {
  categories = [];
}

/**
 * Mock implementation of CategoriesRepository
 */
export class MockCategoriesRepository implements CategoriesRepository {
  async list(_getToken?: () => Promise<string | null>) {
    await randomDelay();
    return {
      data: [...categories],
      error: undefined,
    };
  }

  async get(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();
    const category = categories.find((c) => c.id === id);
    if (!category) {
      return {
        error: {
          error: 'Category not found.',
          code: 'NOT_FOUND',
        },
      };
    }
    return { data: category };
  }

  async create(input: { name: string }, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    // Check for duplicate names (case-insensitive)
    const existingCategory = categories.find(
      (c) => c.name.toLowerCase() === input.name.toLowerCase()
    );

    if (existingCategory) {
      return {
        error: {
          error: 'A category with this name already exists.',
          code: 'DUPLICATE_ENTRY',
        },
      };
    }

    const now = new Date().toISOString();
    const newCategory: Category = {
      id: uuidv4(),
      userId: 'mock-user-id',
      name: input.name,
      createdAt: now,
      updatedAt: now,
    };

    categories.push(newCategory);
    return { data: newCategory };
  }

  async update(id: string, input: { name: string }, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Category not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    // Check for duplicate names (case-insensitive), excluding the current category
    const existingCategory = categories.find(
      (c) => c.id !== id && c.name.toLowerCase() === input.name.toLowerCase()
    );

    if (existingCategory) {
      return {
        error: {
          error: 'A category with this name already exists.',
          code: 'DUPLICATE_ENTRY',
        },
      };
    }

    const existing = categories[index];
    if (!existing) {
      return {
        error: {
          error: 'Category not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    const updated: Category = {
      id: existing.id,
      userId: existing.userId,
      createdAt: existing.createdAt,
      name: input.name,
      updatedAt: new Date().toISOString(),
    };

    categories[index] = updated;
    return { data: updated };
  }

  async remove(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Category not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    // Note: In production (Supabase), this operation also uncategorises
    // subscriptions that reference this category (sets category_id to NULL).
    // For the mock implementation, we don't maintain subscription data,
    // so we just remove the category from the in-memory store.
    categories.splice(index, 1);
    return {};
  }
}
