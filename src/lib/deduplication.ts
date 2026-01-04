/**
 * Deduplication Service
 * 
 * Provides utilities for detecting and handling duplicate transactions.
 */

import type { TransactionEntity } from '@/contracts/transactions';

export interface DeduplicationKey {
  accountId: string;
  transactionReference: string;
  date: string; // ISO date string (YYYY-MM-DD)
}

/**
 * Generate a deduplication key for a transaction
 */
export function generateDeduplicationKey(
  accountId: string,
  transactionReference: string | null | undefined,
  date: string
): DeduplicationKey | null {
  if (!transactionReference) {
    return null; // Cannot deduplicate without reference
  }

  // Normalize date to YYYY-MM-DD format
  const normalizedDate = new Date(date).toISOString().split('T')[0];

  // At this point, transactionReference is guaranteed to be truthy
  return {
    accountId,
    transactionReference: transactionReference.trim(),
    date: normalizedDate,
  } as DeduplicationKey;
}

/**
 * Check if two transactions are duplicates based on deduplication key
 */
export function areTransactionsDuplicates(
  t1: TransactionEntity,
  t2: TransactionEntity
): boolean {
  if (t1.accountId !== t2.accountId) {
    return false;
  }

  if (!t1.transactionReference || !t2.transactionReference) {
    return false; // Cannot deduplicate without reference
  }

  if (t1.transactionReference !== t2.transactionReference) {
    return false;
  }

  // Compare dates (normalized to YYYY-MM-DD)
  const date1 = new Date(t1.date).toISOString().split('T')[0];
  const date2 = new Date(t2.date).toISOString().split('T')[0];

  return date1 === date2;
}

/**
 * Find duplicate transactions in a list
 * Returns a map of deduplication keys to arrays of duplicate transaction indices
 */
export function findDuplicates(
  transactions: TransactionEntity[]
): Map<string, number[]> {
  const duplicates = new Map<string, number[]>();
  const keyToIndices = new Map<string, number[]>();

  transactions.forEach((transaction, index) => {
    if (!transaction.transactionReference) {
      return; // Skip transactions without reference
    }

    const key = generateDeduplicationKey(
      transaction.accountId,
      transaction.transactionReference,
      transaction.date
    );

    if (!key) {
      return;
    }

    const keyString = `${key.accountId}:${key.transactionReference}:${key.date}`;
    
    if (!keyToIndices.has(keyString)) {
      keyToIndices.set(keyString, []);
    }
    
    keyToIndices.get(keyString)!.push(index);
  });

  // Only include keys that have duplicates (more than one transaction)
  keyToIndices.forEach((indices, key) => {
    if (indices.length > 1) {
      duplicates.set(key, indices);
    }
  });

  return duplicates;
}

/**
 * Remove duplicates from a list of transactions, keeping the first occurrence
 */
export function removeDuplicates(
  transactions: TransactionEntity[]
): TransactionEntity[] {
  const seen = new Set<string>();
  const result: TransactionEntity[] = [];

  transactions.forEach((transaction) => {
    if (!transaction.transactionReference) {
      result.push(transaction); // Keep transactions without reference
      return;
    }

    const key = generateDeduplicationKey(
      transaction.accountId,
      transaction.transactionReference,
      transaction.date
    );

    if (!key) {
      result.push(transaction);
      return;
    }

    const keyString = `${key.accountId}:${key.transactionReference}:${key.date}`;
    
    if (!seen.has(keyString)) {
      seen.add(keyString);
      result.push(transaction);
    }
  });

  return result;
}

