/**
 * Budget calculation utilities
 * Handles monthly income/expense calculations and budget metrics
 */

import type { Income } from '@/types/domain';
import type { Expense } from '@/types/domain';
import { calculateMonthlyEquivalent } from '@/features/expenses/utils';
import { formatNumber } from '@/lib/utils';

/**
 * Calculate total monthly income from income sources
 * Converts all frequencies to monthly equivalents
 */
export function calculateMonthlyIncome(incomes: Income[]): number {
  return incomes.reduce((sum, income) => {
    const multiplier = {
      weekly: 52 / 12,      // ~4.33
      fortnightly: 26 / 12,  // ~2.17
      monthly: 1,
      yearly: 1 / 12,
    }[income.frequency];
    
    return sum + income.amount * multiplier;
  }, 0);
}

/**
 * Calculate total monthly expenses from expenses
 * Uses the existing calculateMonthlyEquivalent utility
 */
export function calculateMonthlyExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => {
    return sum + calculateMonthlyEquivalent(expense.amount, expense.frequency);
  }, 0);
}

/**
 * Calculate remaining budget (income - expenses)
 */
export function calculateRemainingBudget(income: number, expenses: number): number {
  return income - expenses;
}

/**
 * Calculate budget percentage (remaining / income * 100)
 * Handles edge cases: zero income, negative values
 */
export function calculateBudgetPercentage(remaining: number, income: number): number {
  if (income === 0) {
    // If no income, return 0% (can't calculate percentage)
    return 0;
  }
  
  const percentage = (remaining / income) * 100;
  
  // Clamp to reasonable range (-100% to 100%)
  return Math.max(-100, Math.min(100, percentage));
}

/**
 * Format budget percentage for display
 */
export function formatBudgetPercentage(percentage: number): string {
  const formatted = formatNumber(Math.abs(percentage), undefined, { maximumFractionDigits: 0 });
  return `${percentage >= 0 ? '' : '-'}${formatted}%`;
}

