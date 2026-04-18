import { describe, it, expect } from 'vitest';
import { getPrimaryIncomeInfo, getSecondaryIncomeLinks } from '../allocateIncome';
import type { Income, Account, PayCycleConfig } from '@/types/domain';

const mkAccount = (id: string, name: string): Account => ({
  id,
  accountName: name,
  balance: 0,
  accountType: 'transaction',
  lastUpdated: '2025-01-01',
  hidden: false,
});

const mkIncome = (
  id: string,
  name: string,
  amount: number,
  frequency: Income['frequency'],
  paidToAccountId?: string
): Income => ({
  id,
  name,
  source: 'Salary',
  amount,
  frequency,
  paidToAccountId,
});

const ACC_PRIMARY = mkAccount('acc-primary', 'Main Chequing');
const ACC_OTHER = mkAccount('acc-other', 'Joint Account');

const payCycle: PayCycleConfig = {
  frequency: 'fortnightly',
  nextPayDate: '2025-04-25',
  primaryIncomeAccountId: 'acc-primary',
};

describe('getPrimaryIncomeInfo', () => {
  it('returns found=true when income matches primary account', () => {
    const income = mkIncome('i1', 'Salary', 3000, 'monthly', 'acc-primary');
    const result = getPrimaryIncomeInfo([income], [ACC_PRIMARY], payCycle);
    expect(result.found).toBe(true);
    expect(result.name).toBe('Salary');
  });

  it('converts monthly income to fortnightly cycle amount', () => {
    const income = mkIncome('i1', 'Salary', 3000, 'monthly', 'acc-primary');
    const result = getPrimaryIncomeInfo([income], [ACC_PRIMARY], payCycle);
    // 3000/month → per-fortnight = 3000 / (26/12) ≈ 1384.6
    expect(result.cycleAmount).toBeCloseTo(3000 / (26 / 12), 1);
  });

  it('includes account name and frequency in sourceLine', () => {
    const income = mkIncome('i1', 'Salary', 3000, 'monthly', 'acc-primary');
    const result = getPrimaryIncomeInfo([income], [ACC_PRIMARY], payCycle);
    expect(result.sourceLine).toContain('Main Chequing');
    expect(result.sourceLine).toContain('Monthly');
    expect(result.sourceLine).toContain('Salary');
  });

  it('returns found=false when no income matches primary account', () => {
    const result = getPrimaryIncomeInfo([], [ACC_PRIMARY], payCycle);
    expect(result.found).toBe(false);
    expect(result.cycleAmount).toBe(0);
  });
});

describe('getSecondaryIncomeLinks', () => {
  it('returns secondary incomes not linked to primary account', () => {
    const primary = mkIncome('i1', 'Salary', 3000, 'monthly', 'acc-primary');
    const secondary = mkIncome('i2', 'Freelance', 1000, 'monthly', 'acc-other');
    const links = getSecondaryIncomeLinks([primary, secondary], [ACC_PRIMARY, ACC_OTHER], payCycle, 'en-US');
    expect(links.length).toBe(1);
    expect(links[0].label).toContain('Freelance');
    expect(links[0].label).toContain('Joint Account');
  });

  it('returns empty when all incomes are primary', () => {
    const primary = mkIncome('i1', 'Salary', 3000, 'monthly', 'acc-primary');
    const links = getSecondaryIncomeLinks([primary], [ACC_PRIMARY], payCycle, 'en-US');
    expect(links.length).toBe(0);
  });

  it('label includes cycle-amount string', () => {
    const secondary = mkIncome('i2', 'Rental', 2000, 'monthly', 'acc-other');
    const links = getSecondaryIncomeLinks([secondary], [ACC_OTHER], payCycle, 'en-US');
    // $2000/month → fortnightly ≈ $923
    expect(links[0].label).toMatch(/\$\d+/);
  });
});
