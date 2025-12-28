import { createCategoriesRepository } from './repo';

/**
 * Default categories to create for new users
 * Includes "Uncategorised" plus popular subscription categories
 */
const DEFAULT_CATEGORY_NAMES = [
  'Uncategorised',
  'Utilities',
  'Entertainment',
  'Software',
  'Streaming',
  'Cloud Storage',
  'Insurance',
] as const;

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
    // Attempt to create each default category
    // Duplicates will fail with DUPLICATE_ENTRY which is expected
    const createPromises = DEFAULT_CATEGORY_NAMES.map(async (name) => {
      const result = await repository.create({ name }, getToken);
      // Treat DUPLICATE_ENTRY as success (category already exists)
      if (result.error && result.error.code !== 'DUPLICATE_ENTRY') {
        console.warn(`Failed to create default category "${name}":`, result.error);
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
    console.error('Unexpected error ensuring default categories:', error);
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

