import type { Account } from '@/types/domain';

export const ACCOUNT_TYPE_OPTIONS = [
  'Bank Account',
  'Savings',
  'Credit Card',
  'Loan',
  'Other',
] as const;

export type AccountTypeOption = (typeof ACCOUNT_TYPE_OPTIONS)[number];
export type AccountHoldingBucket = 'asset' | 'liability';

const LIABILITY_TYPES = new Set<string>(['credit card', 'loan']);
const NORMALIZED_TYPE_MAP: Record<string, AccountTypeOption> = {
  'bank account': 'Bank Account',
  savings: 'Savings',
  'credit card': 'Credit Card',
  loan: 'Loan',
  other: 'Other',
};

function normalizeTypeKey(accountType: string): string {
  return accountType.trim().toLowerCase();
}

export interface AccountClassificationResult {
  bucket: AccountHoldingBucket;
  normalizedType: string;
  isUnknownType: boolean;
}

export interface ClassifiedAccountHolding extends AccountClassificationResult {
  account: Account;
  holdingValue: number;
}

export function classifyAccountType(accountType: string): AccountClassificationResult {
  const key = normalizeTypeKey(accountType);
  const normalizedType = NORMALIZED_TYPE_MAP[key] ?? 'Uncategorized account';
  const bucket: AccountHoldingBucket = LIABILITY_TYPES.has(key) ? 'liability' : 'asset';
  return {
    bucket,
    normalizedType,
    isUnknownType: !(key in NORMALIZED_TYPE_MAP),
  };
}

export function getAccountHoldingValue(account: Account): number {
  const { bucket } = classifyAccountType(account.accountType);
  if (bucket === 'liability') {
    if (typeof account.balanceOwed === 'number' && Number.isFinite(account.balanceOwed)) {
      return Math.max(0, account.balanceOwed);
    }
    return Math.abs(Math.min(0, account.balance));
  }
  return Math.max(0, account.balance);
}

export function classifyAccountHolding(account: Account): ClassifiedAccountHolding {
  const classification = classifyAccountType(account.accountType);
  return {
    ...classification,
    account,
    holdingValue: getAccountHoldingValue(account),
  };
}
