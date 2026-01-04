import type { Liability, Expense } from '@/types/domain';
import { createExpensesRepository } from '@/data/expenses/repo';
import { createCategoriesRepository } from '@/data/categories/repo';
import { calculateNextDueDate } from '@/features/expenses/utils';
import { findUncategorisedCategoryId } from '@/data/categories/ensureDefaults';
import { logger, getCorrelationId } from '@/lib/logger';

/**
 * Service to manage expenses created from liability repayment information
 * Automatically creates/updates/deletes expenses when liability repayment fields change
 */

const LIABILITY_SUBSCRIPTION_PREFIX = 'Liability Repayment: ';
const LIABILITY_ID_MARKER = 'linkedLiabilityId:';

/**
 * Extract liability ID from subscription notes
 */
function extractLiabilityIdFromNotes(notes?: string): string | undefined {
  if (!notes) return undefined;
  const markerIndex = notes.indexOf(LIABILITY_ID_MARKER);
  if (markerIndex === -1) return undefined;
  const idStart = markerIndex + LIABILITY_ID_MARKER.length;
  const idEnd = notes.indexOf('\n', idStart);
  return notes.substring(idStart, idEnd === -1 ? notes.length : idEnd);
}

/**
 * Create notes for subscription linking to liability
 */
function createSubscriptionNotes(liability: Liability): string {
  return `${LIABILITY_ID_MARKER}${liability.id}\n\nAuto-created from liability: ${liability.name}`;
}

/**
 * Find expense linked to a liability
 */
export async function findLinkedSubscription(
  liabilityId: string,
  getToken: () => Promise<string | null>
): Promise<Expense | undefined> {
  const repository = createExpensesRepository();
  const result = await repository.list(getToken);
  
  if (result.error || !result.data) {
    return undefined;
  }

  return result.data.find((sub) => {
    const linkedId = extractLiabilityIdFromNotes(sub.notes);
    return linkedId === liabilityId;
  });
}

/**
 * Get or create appropriate category for liability repayments
 * Uses "Uncategorised" as fallback
 */
async function getLiabilityCategoryId(
  getToken: () => Promise<string | null>
): Promise<string | undefined> {
  const repository = createCategoriesRepository();
  const categoriesResult = await repository.list(getToken);
  
  // For now, use Uncategorised category
  // In the future, we could create a "Debt" category
  if (categoriesResult.error || !categoriesResult.data) {
    return undefined;
  }
  
  return findUncategorisedCategoryId(
    categoriesResult.data.map(c => ({ id: c.id, name: c.name }))
  );
}

/**
 * Create a subscription from liability repayment information
 */
export async function createSubscriptionFromLiability(
  liability: Liability,
  getToken: () => Promise<string | null>
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  const correlationId = getCorrelationId();

  // Check if liability has repayment info
  if (!liability.repaymentAmount || !liability.repaymentFrequency) {
    logger.debug(
      'LIABILITY:SUBSCRIPTION_CREATE',
      'Skipping subscription creation - no repayment info',
      { liabilityId: liability.id },
      correlationId || undefined
    );
    return { success: true }; // Not an error, just nothing to do
  }

  try {
    // Check if subscription already exists
    const existing = await findLinkedSubscription(liability.id, getToken);
    if (existing) {
      logger.debug(
        'LIABILITY:SUBSCRIPTION_CREATE',
        'Subscription already exists for liability',
        { liabilityId: liability.id, subscriptionId: existing.id },
        correlationId || undefined
      );
      // Update existing instead
      return await updateSubscriptionFromLiability(existing.id, liability, getToken);
    }

    // Get category ID
    const categoryId = await getLiabilityCategoryId(getToken);
    if (!categoryId) {
      logger.warn(
        'LIABILITY:SUBSCRIPTION_CREATE',
        'Could not find category for subscription',
        { liabilityId: liability.id },
        correlationId || undefined
      );
      return {
        success: false,
        error: 'Could not find category for subscription',
      };
    }

    // Calculate dates - we know repaymentFrequency is defined because of the check above
    const chargeDate = liability.dueDate 
      ? (liability.dueDate.split('T')[0] || liability.dueDate)
      : (new Date().toISOString().split('T')[0] || new Date().toISOString());
    const nextDueDate = calculateNextDueDate(chargeDate, liability.repaymentFrequency!);

    // Create expense
    const repository = createExpensesRepository();
    const expenseData: Omit<Expense, 'id'> = {
      name: `${LIABILITY_SUBSCRIPTION_PREFIX}${liability.name}`,
      amount: liability.repaymentAmount!,
      frequency: liability.repaymentFrequency!,
      chargeDate,
      nextDueDate,
      categoryId,
      notes: createSubscriptionNotes(liability),
    };

    const result = await repository.create(expenseData, getToken);
    
    if (result.error) {
      logger.error(
        'LIABILITY:SUBSCRIPTION_CREATE',
        'Failed to create subscription from liability',
        { liabilityId: liability.id, error: result.error },
        correlationId || undefined
      );
      return {
        success: false,
        error: result.error.error || 'Failed to create subscription',
      };
    }

    logger.info(
      'LIABILITY:SUBSCRIPTION_CREATE',
      'Successfully created subscription from liability',
      { liabilityId: liability.id, subscriptionId: result.data?.id },
      correlationId || undefined
    );

    return {
      success: true,
      subscriptionId: result.data?.id,
    };
  } catch (error) {
    logger.error(
      'LIABILITY:SUBSCRIPTION_CREATE',
      'Unexpected error creating subscription from liability',
      { liabilityId: liability.id, error },
      correlationId || undefined
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update an existing subscription from liability repayment information
 */
export async function updateSubscriptionFromLiability(
  subscriptionId: string,
  liability: Liability,
  getToken: () => Promise<string | null>
): Promise<{ success: boolean; error?: string }> {
  const correlationId = getCorrelationId();

  // If no repayment info, delete the subscription
  if (!liability.repaymentAmount || !liability.repaymentFrequency) {
    return await deleteSubscriptionIfNoRepayment(liability, getToken);
  }

  try {
    const repository = createExpensesRepository();
    
    // Calculate dates - we know repaymentFrequency is defined because of the check above
    const chargeDate = liability.dueDate 
      ? (liability.dueDate.split('T')[0] || liability.dueDate)
      : (new Date().toISOString().split('T')[0] || new Date().toISOString());
    const nextDueDate = calculateNextDueDate(chargeDate, liability.repaymentFrequency!);

    const updateData: Partial<Expense> = {
      name: `${LIABILITY_SUBSCRIPTION_PREFIX}${liability.name}`,
      amount: liability.repaymentAmount!,
      frequency: liability.repaymentFrequency!,
      chargeDate,
      nextDueDate,
      notes: createSubscriptionNotes(liability),
    };

    const result = await repository.update(subscriptionId, updateData, getToken);
    
    if (result.error) {
      logger.error(
        'LIABILITY:SUBSCRIPTION_UPDATE',
        'Failed to update subscription from liability',
        { liabilityId: liability.id, subscriptionId, error: result.error },
        correlationId || undefined
      );
      return {
        success: false,
        error: result.error.error || 'Failed to update subscription',
      };
    }

    logger.info(
      'LIABILITY:SUBSCRIPTION_UPDATE',
      'Successfully updated subscription from liability',
      { liabilityId: liability.id, subscriptionId },
      correlationId || undefined
    );

    return { success: true };
  } catch (error) {
    logger.error(
      'LIABILITY:SUBSCRIPTION_UPDATE',
      'Unexpected error updating subscription from liability',
      { liabilityId: liability.id, subscriptionId, error },
      correlationId || undefined
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete subscription if liability no longer has repayment info
 */
export async function deleteSubscriptionIfNoRepayment(
  liability: Liability,
  getToken: () => Promise<string | null>
): Promise<{ success: boolean; error?: string }> {
  const correlationId = getCorrelationId();

  try {
    const existing = await findLinkedSubscription(liability.id, getToken);
    if (!existing) {
      // No subscription to delete, that's fine
      return { success: true };
    }

    const repository = createExpensesRepository();
    const result = await repository.remove(existing.id, getToken);
    
    if (result.error) {
      logger.error(
        'LIABILITY:SUBSCRIPTION_DELETE',
        'Failed to delete subscription for liability',
        { liabilityId: liability.id, subscriptionId: existing.id, error: result.error },
        correlationId || undefined
      );
      return {
        success: false,
        error: result.error.error || 'Failed to delete subscription',
      };
    }

    logger.info(
      'LIABILITY:SUBSCRIPTION_DELETE',
      'Successfully deleted subscription for liability',
      { liabilityId: liability.id, subscriptionId: existing.id },
      correlationId || undefined
    );

    return { success: true };
  } catch (error) {
    logger.error(
      'LIABILITY:SUBSCRIPTION_DELETE',
      'Unexpected error deleting subscription for liability',
      { liabilityId: liability.id, error },
      correlationId || undefined
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

