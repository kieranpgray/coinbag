import { describe, expect, it } from 'vitest';
import {
  classifyAccountHolding,
  classifyAccountType,
  getAccountHoldingValue,
} from '../accountClassification';

describe('accountClassification', () => {
  it('classifies credit card and loan as liabilities', () => {
    expect(classifyAccountType('Credit Card').bucket).toBe('liability');
    expect(classifyAccountType('Loan').bucket).toBe('liability');
  });

  it('classifies savings and bank account as assets', () => {
    expect(classifyAccountType('Savings').bucket).toBe('asset');
    expect(classifyAccountType('Bank Account').bucket).toBe('asset');
  });

  it('marks unknown account types and applies fallback label', () => {
    const result = classifyAccountType('Offset');
    expect(result.bucket).toBe('asset');
    expect(result.isUnknownType).toBe(true);
    expect(result.normalizedType).toBe('Uncategorized account');
  });

  it('uses balanceOwed for liability holding value when available', () => {
    const value = getAccountHoldingValue({
      id: 'a1',
      accountName: 'Credit Card',
      accountType: 'Credit Card',
      institution: undefined,
      balance: -1200,
      balanceOwed: 1500,
      creditLimit: 2000,
      lastUpdated: new Date().toISOString(),
      hidden: false,
      currency: 'AUD',
    });
    expect(value).toBe(1500);
  });

  it('returns classified holding metadata', () => {
    const classified = classifyAccountHolding({
      id: 'a2',
      accountName: 'Savings',
      accountType: 'Savings',
      institution: undefined,
      balance: 4200,
      lastUpdated: new Date().toISOString(),
      hidden: false,
      currency: 'AUD',
    });
    expect(classified.bucket).toBe('asset');
    expect(classified.isUnknownType).toBe(false);
    expect(classified.holdingValue).toBe(4200);
  });
});
