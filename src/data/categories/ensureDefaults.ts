import { logger } from '@/lib/logger';
import { createCategoriesRepository } from './repo';
import { DEFAULT_CATEGORY_NAMES } from './constants';

/**
 * Ensures default categories exist for the current user
 * Idempotent: duplicate errors are treated as success
 * Returns the full list of categories after ensuring defaults
 */
export async function ensureDefaultCategories(
  getToken: () => Promise<string | null>
): Promise<{ success: boolean; error?: string }> {
  const repository = createCategoriesRepository();

  try {
    // First, get existing categories to avoid unnecessary create attempts
    const existingResult = await repository.list(getToken);
    if (existingResult.error) {
      logger.error('CATEGORIES:ENSURE_DEFAULTS', 'Failed to fetch existing categories', { error: existingResult.error });
      return {
        success: false,
        error: 'Failed to check existing categories',
      };
    }

    const existingCategoryNames = new Set(
      existingResult.data.map(cat => cat.name.toLowerCase())
    );

    // Only attempt to create categories that don't already exist
    const categoriesToCreate = DEFAULT_CATEGORY_NAMES.filter(
      name => !existingCategoryNames.has(name.toLowerCase())
    );

    if (categoriesToCreate.length === 0) {
      // All categories already exist
      return { success: true };
    }

    logger.info('CATEGORIES:ENSURE_DEFAULTS', `Creating ${categoriesToCreate.length} missing default categories`, {
      categories: categoriesToCreate
    });

    // Create missing categories
    const createPromises = categoriesToCreate.map(async (name) => {
      const result = await repository.create({ name }, getToken);
      // Treat DUPLICATE_ENTRY and other expected conflicts as success
      if (result.error && !['DUPLICATE_ENTRY', 'CONFLICT'].includes(result.error.code)) {
        logger.warn('CATEGORIES:ENSURE_DEFAULTS', `Failed to create default category "${name}"`, { error: result.error });
        return { success: false, error: result.error };
      }
      return { success: true };
    });

    const results = await Promise.all(createPromises);

    // Check if any critical failures occurred (non-duplicate errors)
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      return {
        success: false,
        error: 'Failed to create some default categories',
      };
    }

    return { success: true };
  } catch (error) {
    logger.error('CATEGORIES:ENSURE_DEFAULTS', 'Unexpected error ensuring default categories', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Find the "Uncategorised" category ID from a list of categories
 * Returns undefined if not found
 */
export function findUncategorisedCategoryId(
  categories: Array<{ id: string; name: string }>
): string | undefined {
  return categories.find((c) => c.name === 'Uncategorised')?.id;
}

