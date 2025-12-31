/**
 * Category helper utilities
 * Provides safe category lookups with fallback to "Uncategorised" for deprecated categories
 */

/**
 * Get category name with fallback to "Uncategorised" if category doesn't exist
 * This handles deprecated/deleted categories gracefully
 */
export function getCategoryNameSafe(
  categoryId: string,
  categoryMap: Map<string, string>,
  uncategorisedId?: string
): string {
  // If category exists in map, return its name
  const categoryName = categoryMap.get(categoryId);
  if (categoryName) {
    return categoryName;
  }
  
  // If category doesn't exist (deprecated), return "Uncategorised"
  // Check if the ID itself is the uncategorised ID
  if (uncategorisedId && categoryId === uncategorisedId) {
    return 'Uncategorised';
  }
  
  // Category is deprecated/missing - treat as Uncategorised
  return 'Uncategorised';
}

/**
 * Check if a category ID is deprecated (doesn't exist in category map)
 */
export function isCategoryDeprecated(
  categoryId: string,
  categoryMap: Map<string, string>
): boolean {
  return !categoryMap.has(categoryId);
}

