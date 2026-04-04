import { describe, expect, it } from 'vitest';
import { isRepaymentCategoryId } from '../repaymentCategory';
import type { Category } from '@/types/domain';

describe('repaymentCategory helper', () => {
  const categories: Category[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      userId: 'user_1',
      name: 'Loan Repayments',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      userId: 'user_1',
      name: 'Groceries',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  it('returns true for repayment-mapped categories', () => {
    expect(isRepaymentCategoryId('11111111-1111-4111-8111-111111111111', categories)).toBe(true);
  });

  it('returns false for non-repayment categories', () => {
    expect(isRepaymentCategoryId('22222222-2222-4222-8222-222222222222', categories)).toBe(false);
  });

  it('returns false for unknown category ids', () => {
    expect(isRepaymentCategoryId('33333333-3333-4333-8333-333333333333', categories)).toBe(false);
  });
});

