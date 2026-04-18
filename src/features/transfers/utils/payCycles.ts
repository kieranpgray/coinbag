/**
 * Pay cycle list and cycle-state utilities.
 *
 * Timezone rule: all date comparisons use LOCAL calendar dates.
 * Dates are processed via date-fns at start-of-day in the user's local timezone.
 * A cycle is considered "active" if today falls on or between the cycle's start and end dates.
 *
 * Cycle window:
 *   - weekly:      [payDate, payDate + 6 days]
 *   - fortnightly: [payDate, payDate + 13 days]
 *   - monthly:     [payDate, next month payDate − 1 day]
 */

import {
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  subDays,
  startOfDay,
  isWithinInterval,
  format,
  isAfter,
} from 'date-fns';
import type { PayCycleConfig } from '@/types/domain';

/**
 * Parse a YYYY-MM-DD string as a LOCAL calendar date (not UTC midnight).
 * Using new Date(y, m-1, d) avoids the UTC → local TZ shift that parseISO causes.
 * Throws on malformed input to prevent silent Invalid Date propagation.
 */
function parseLocalDate(iso: string): Date {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3) {
    throw new Error(`Invalid pay date: "${iso}". Expected YYYY-MM-DD.`);
  }
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) {
    throw new Error(`Invalid pay date: "${iso}". Expected YYYY-MM-DD.`);
  }
  return new Date(y, m - 1, d);
}

/** How many cycles to look back and forward from the anchor (next pay date). */
export const CYCLE_WINDOW_RADIUS = 24;

export type CycleState = 'active' | 'upcoming' | 'past';

export interface PayCycle {
  /** Start of this cycle window (the pay date itself) */
  payDate: Date;
  /** End of this cycle window (inclusive) */
  endDate: Date;
  /** Human-readable label for the pay date slot, e.g. "Fri 25 Apr 2025" */
  label: string;
  /** Shorter label for prev/next slots, e.g. "25 Apr 2025" */
  shortLabel: string;
  state: CycleState;
}

/**
 * Advance a date by one pay period.
 */
function addOneCycle(date: Date, frequency: PayCycleConfig['frequency']): Date {
  if (frequency === 'weekly') return addWeeks(date, 1);
  if (frequency === 'fortnightly') return addWeeks(date, 2);
  return addMonths(date, 1);
}

/**
 * Subtract one pay period from a date.
 */
function subOneCycle(date: Date, frequency: PayCycleConfig['frequency']): Date {
  if (frequency === 'weekly') return subWeeks(date, 1);
  if (frequency === 'fortnightly') return subWeeks(date, 2);
  return subMonths(date, 1);
}

/**
 * Compute the end date of a cycle (inclusive, day before next pay date).
 */
function cycleEndDate(payDate: Date, frequency: PayCycleConfig['frequency']): Date {
  return subDays(addOneCycle(payDate, frequency), 1);
}

/**
 * Derive cycle state for a given cycle's window vs. today.
 *
 * - active:   today is within [payDate, endDate] (inclusive)
 * - upcoming: payDate is after today
 * - past:     endDate is before today
 */
function deriveCycleState(payDate: Date, endDate: Date, today: Date): CycleState {
  const todayStart = startOfDay(today);
  const cycleStart = startOfDay(payDate);
  const cycleEnd = startOfDay(endDate);

  if (isWithinInterval(todayStart, { start: cycleStart, end: cycleEnd })) {
    return 'active';
  }
  if (isAfter(cycleStart, todayStart)) {
    return 'upcoming';
  }
  return 'past';
}

/**
 * Build an ordered list of pay cycles centred around the configured `nextPayDate`.
 *
 * Returns `CYCLE_WINDOW_RADIUS * 2 + 1` cycles (past → present → future).
 * The default selected index is the first cycle whose state is `active`;
 * if none, it falls back to the first `upcoming` cycle.
 */
export function buildPayCycles(
  config: PayCycleConfig,
  today: Date = new Date()
): { cycles: PayCycle[]; defaultIndex: number } {
  const anchor = startOfDay(parseLocalDate(config.nextPayDate));

  // Build cycles backward from anchor
  const pastCycles: Date[] = [];
  let cursor = subOneCycle(anchor, config.frequency);
  for (let i = 0; i < CYCLE_WINDOW_RADIUS; i++) {
    pastCycles.unshift(cursor);
    cursor = subOneCycle(cursor, config.frequency);
  }

  // Build cycles forward from anchor (inclusive of anchor)
  const futureCycles: Date[] = [anchor];
  cursor = addOneCycle(anchor, config.frequency);
  for (let i = 0; i < CYCLE_WINDOW_RADIUS; i++) {
    futureCycles.push(cursor);
    cursor = addOneCycle(cursor, config.frequency);
  }

  const allPayDates = [...pastCycles, ...futureCycles];

  const cycles: PayCycle[] = allPayDates.map((payDate) => {
    const endDate = cycleEndDate(payDate, config.frequency);
    const state = deriveCycleState(payDate, endDate, today);
    return {
      payDate,
      endDate,
      label: format(payDate, 'EEE d MMM yyyy'),
      shortLabel: format(payDate, 'd MMM yyyy'),
      state,
    };
  });

  // Default to first active cycle; fall back to first upcoming; finally last index
  let defaultIndex = cycles.findIndex((c) => c.state === 'active');
  if (defaultIndex === -1) {
    defaultIndex = cycles.findIndex((c) => c.state === 'upcoming');
  }
  if (defaultIndex === -1) {
    defaultIndex = cycles.length - 1;
  }

  return { cycles, defaultIndex };
}

/**
 * Returns the `PayCycle` entry at the given index and whether the chevrons
 * at that index should be disabled.
 *
 * The index is clamped to [0, cycles.length - 1] so stale selectedCycleIndex
 * values (e.g. after payCycle frequency changes) never produce undefined cycles.
 */
export function getCycleAtIndex(
  cycles: PayCycle[],
  index: number
): {
  cycle: PayCycle;
  isFirst: boolean;
  isLast: boolean;
  prev: PayCycle | null;
  next: PayCycle | null;
} {
  if (cycles.length === 0) {
    throw new Error('getCycleAtIndex called with empty cycles array');
  }
  const i = Math.min(Math.max(index, 0), cycles.length - 1);
  const cycle = cycles[i];
  if (!cycle) {
    throw new Error('getCycleAtIndex: cycle missing after index clamp');
  }
  return {
    cycle,
    isFirst: i === 0,
    isLast: i === cycles.length - 1,
    prev: i > 0 ? cycles[i - 1] ?? null : null,
    next: i < cycles.length - 1 ? cycles[i + 1] ?? null : null,
  };
}

/**
 * Compute the per-cycle income amount from a monthly-equivalent base.
 * All calculations flow through monthly normalisation consistent with
 * the rest of the app (see frequencyNormalization.ts).
 */
export function cycleIncomeAmount(monthlyAmount: number, frequency: PayCycleConfig['frequency']): number {
  if (frequency === 'monthly') return monthlyAmount;
  if (frequency === 'weekly') return monthlyAmount / (52 / 12);
  // fortnightly
  return monthlyAmount / (26 / 12);
}

/**
 * Compute the per-cycle committed amount from a monthly-equivalent base.
 * Same formula as cycleIncomeAmount — consistent with the rest of the app.
 */
export const cycleCommittedAmount = cycleIncomeAmount;

/**
 * Convenience helper: return a display-friendly frequency string.
 */
export function frequencyLabel(frequency: PayCycleConfig['frequency']): string {
  if (frequency === 'weekly') return 'Weekly';
  if (frequency === 'fortnightly') return 'Fortnightly';
  return 'Monthly';
}
