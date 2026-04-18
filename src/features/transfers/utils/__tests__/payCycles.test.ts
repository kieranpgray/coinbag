import { describe, it, expect } from 'vitest';
import { format } from 'date-fns';
import {
  buildPayCycles,
  getCycleAtIndex,
  cycleIncomeAmount,
  CYCLE_WINDOW_RADIUS,
} from '../payCycles';
import type { PayCycleConfig } from '@/types/domain';

const fmtDate = (d: Date) => format(d, 'yyyy-MM-dd');

const baseConfig: PayCycleConfig = {
  frequency: 'fortnightly',
  nextPayDate: '2025-04-25',
  primaryIncomeAccountId: 'acc-1',
};

describe('buildPayCycles', () => {
  it('returns 2 * CYCLE_WINDOW_RADIUS + 1 cycles', () => {
    const { cycles } = buildPayCycles(baseConfig, new Date('2025-04-25'));
    expect(cycles.length).toBe(CYCLE_WINDOW_RADIUS * 2 + 1);
  });

  it('sets the cycle at anchor to active when today === pay date', () => {
    const today = new Date('2025-04-25');
    const { cycles, defaultIndex } = buildPayCycles(baseConfig, today);
    expect(cycles[defaultIndex].state).toBe('active');
    expect(fmtDate(cycles[defaultIndex].payDate)).toBe('2025-04-25');
  });

  it('sets active when today is mid-cycle (fortnightly, day 6)', () => {
    const today = new Date('2025-04-30');
    const { cycles, defaultIndex } = buildPayCycles(baseConfig, today);
    expect(cycles[defaultIndex].state).toBe('active');
  });

  it('marks anchor as upcoming when today is before pay date', () => {
    // today = Apr 20; nextPayDate = Apr 25.
    // The active cycle is the PRIOR fortnight (Apr 11–24). Default is that active cycle.
    // The anchor itself (Apr 25) is upcoming.
    const today = new Date('2025-04-20');
    const { cycles } = buildPayCycles(baseConfig, today);
    const anchorCycle = cycles[CYCLE_WINDOW_RADIUS];
    expect(fmtDate(anchorCycle.payDate)).toBe('2025-04-25');
    expect(anchorCycle.state).toBe('upcoming');
  });

  it('marks all cycles before today as past', () => {
    const today = new Date('2025-05-10');
    const { cycles } = buildPayCycles(baseConfig, today);
    // Cycles ending before 2025-05-10 should be past
    const pastCycles = cycles.filter((c) => c.state === 'past');
    pastCycles.forEach((c) => {
      expect(c.endDate < today).toBe(true);
    });
  });

  it('defaultIndex is first upcoming when no active found', () => {
    // Today is before all cycles — shouldn't happen normally but guard
    const veryEarlyConfig: PayCycleConfig = { ...baseConfig, nextPayDate: '2030-01-01' };
    const { cycles, defaultIndex } = buildPayCycles(veryEarlyConfig, new Date('2025-01-01'));
    expect(cycles[defaultIndex].state).toBe('upcoming');
  });

  it('works with weekly frequency', () => {
    const cfg: PayCycleConfig = { ...baseConfig, frequency: 'weekly' };
    const { cycles } = buildPayCycles(cfg, new Date('2025-04-25'));
    // Each cycle should be 7 days: endDate = payDate + 6
    const mid = cycles[CYCLE_WINDOW_RADIUS];
    const diff = (mid.endDate.getTime() - mid.payDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(6);
  });

  it('works with monthly frequency', () => {
    const cfg: PayCycleConfig = { ...baseConfig, frequency: 'monthly' };
    const { cycles } = buildPayCycles(cfg, new Date('2025-04-25'));
    expect(cycles.length).toBe(CYCLE_WINDOW_RADIUS * 2 + 1);
    // end of april cycle should be 2025-05-24 (day before next month's pay date)
    const mid = cycles[CYCLE_WINDOW_RADIUS];
    expect(fmtDate(mid.payDate)).toBe('2025-04-25');
    expect(fmtDate(mid.endDate)).toBe('2025-05-24');
  });

  it('pay-day boundary: today is last day of fortnightly cycle', () => {
    // fortnightly from 2025-04-25, so end = 2025-05-08
    const today = new Date('2025-05-08');
    const { cycles, defaultIndex } = buildPayCycles(baseConfig, today);
    expect(cycles[defaultIndex].state).toBe('active');
  });

  it('first index is disabled (isFirst = true)', () => {
    const { cycles } = buildPayCycles(baseConfig, new Date('2025-04-25'));
    const { isFirst } = getCycleAtIndex(cycles, 0);
    expect(isFirst).toBe(true);
  });

  it('last index is disabled (isLast = true)', () => {
    const { cycles } = buildPayCycles(baseConfig, new Date('2025-04-25'));
    const { isLast } = getCycleAtIndex(cycles, cycles.length - 1);
    expect(isLast).toBe(true);
  });
});

describe('getCycleAtIndex', () => {
  it('returns null prev at first index', () => {
    const { cycles } = buildPayCycles(baseConfig, new Date('2025-04-25'));
    const { prev } = getCycleAtIndex(cycles, 0);
    expect(prev).toBeNull();
  });

  it('returns null next at last index', () => {
    const { cycles } = buildPayCycles(baseConfig, new Date('2025-04-25'));
    const { next } = getCycleAtIndex(cycles, cycles.length - 1);
    expect(next).toBeNull();
  });

  it('returns adjacent cycles for middle index', () => {
    const { cycles, defaultIndex } = buildPayCycles(baseConfig, new Date('2025-04-25'));
    const { prev, next } = getCycleAtIndex(cycles, defaultIndex);
    expect(prev).not.toBeNull();
    expect(next).not.toBeNull();
  });
});

describe('cycleIncomeAmount', () => {
  const monthlyBase = 5000;

  it('monthly → same amount', () => {
    expect(cycleIncomeAmount(monthlyBase, 'monthly')).toBe(monthlyBase);
  });

  it('fortnightly → monthly / (26/12)', () => {
    const expected = monthlyBase / (26 / 12);
    expect(cycleIncomeAmount(monthlyBase, 'fortnightly')).toBeCloseTo(expected, 2);
  });

  it('weekly → monthly / (52/12)', () => {
    const expected = monthlyBase / (52 / 12);
    expect(cycleIncomeAmount(monthlyBase, 'weekly')).toBeCloseTo(expected, 2);
  });
});
