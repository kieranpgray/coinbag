import { logger } from '@/lib/logger';
import { createCategoriesRepository } from './repo';

/**
 * Default categories to create for new users
 * Organized by expense type for US and AU markets
 * Aligned with budget page tabs: Subscriptions, Bills, Repayments, Living, Lifestyle
 */
const DEFAULT_CATEGORY_NAMES = [
  // Uncategorised (always first)
  'Uncategorised',

  // Subscriptions
  'Streaming',
  'Entertainment',
  'Software',
  'Cloud Storage',
  'Gym Membership',
  'News & Media',

  // Bills
  'Utilities',
  'Electricity',
  'Gas',
  'Water',
  'Phone / Internet',
  'Insurance',
  'Rent',
  'Mortgage',

  // Repayments
  'Credit Card',
  'Student Loan',
  'Personal Loan',
  'Car Loan',
  'Home Loan',
  'Loan Repayments',
  'Credit Card Payments',

  // Savings
  'Savings',
  'Emergency Fund',
  'Investment',
  'Retirement / Superannuation / 401k',

  // Living
  'Groceries',
  'Food',
  'Transportation',
  'Public Transport',
  'Fuel',
  'Health',
  'Medical',
  'Pharmacy',
  'Education',
  'Childcare / School Fees',

  // Lifestyle
  'Dining Out',
  'Coffee',
  'Shopping',
  'Clothing',
  'Hobbies',
  'Travel',
  'Entertainment',
  'Personal Care',
  'Medicine / Pharmacy',
  'Technology & Gadgets',
  'Home Maintenance',
  'Big Purchase',
  'Gifts',
  'Donations',
  'Miscellaneous',
  'Cash Withdrawals',
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

