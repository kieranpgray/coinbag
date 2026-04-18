import { describe, it, expect } from 'vitest';
import {
  buildNetWorthYAxis,
  formatNetWorthYAxisTick,
  nextNiceStep,
  nextLargerNiceStep,
} from '../netWorthAxis';

describe('formatNetWorthYAxisTick', () => {
  it('formats thousands with lowercase k and dollar prefix', () => {
    expect(formatNetWorthYAxisTick(380_000)).toBe('$380k');
    expect(formatNetWorthYAxisTick(3_000)).toBe('$3k');
  });

  it('formats millions with lowercase m', () => {
    expect(formatNetWorthYAxisTick(1_100_000)).toBe('$1.1m');
    expect(formatNetWorthYAxisTick(1_000_000)).toBe('$1m');
  });

  it('formats values under 1k as plain dollars', () => {
    expect(formatNetWorthYAxisTick(950)).toBe('$950');
  });

  it('prefixes negatives', () => {
    expect(formatNetWorthYAxisTick(-50_000)).toBe('-$50k');
    expect(formatNetWorthYAxisTick(-1_250_000)).toBe('-$1.3m');
  });

  it('respects extra precision for k/m when requested', () => {
    expect(
      formatNetWorthYAxisTick(1_150_000, { mMax: 2 })
    ).toBe('$1.15m');
  });
});

describe('nextNiceStep', () => {
  it('returns ladder multiples of 10^n', () => {
    expect(nextNiceStep(550)).toBe(1000);
    expect(nextNiceStep(6000)).toBe(10000);
    expect(nextNiceStep(18000)).toBe(20000);
    expect(nextNiceStep(75000)).toBe(100000);
  });
});

describe('buildNetWorthYAxis', () => {
  it('produces obvious steps for low range (~$2k–$4k)', () => {
    const { ticks, domain } = buildNetWorthYAxis(2000, 4000, {
      targetTickCount: 5,
    });
    expect(domain[0]).toBeLessThanOrEqual(2000);
    expect(domain[1]).toBeGreaterThanOrEqual(4000);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    const labels = ticks.map((t) => formatNetWorthYAxisTick(t));
    expect(labels.some((l) => l.includes('k'))).toBe(true);
    for (let i = 1; i < labels.length; i++) {
      expect(labels[i]).not.toBe(labels[i - 1]);
    }
  });

  it('produces meaningful steps for ~$120k–$180k', () => {
    const { ticks } = buildNetWorthYAxis(120_000, 180_000, {
      targetTickCount: 5,
    });
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    const step = ticks[1]! - ticks[0]!;
    expect(step).toBeGreaterThanOrEqual(10_000);
    const labels = ticks.map((t) => formatNetWorthYAxisTick(t));
    for (let i = 1; i < labels.length; i++) {
      expect(labels[i]).not.toBe(labels[i - 1]);
    }
  });

  it('uses larger steps for ~$700k–$900k', () => {
    const { ticks } = buildNetWorthYAxis(700_000, 900_000, {
      targetTickCount: 5,
    });
    const step = ticks[1]! - ticks[0]!;
    expect(step).toBeGreaterThanOrEqual(50_000);
  });

  it('uses 100k-style steps for million-scale span', () => {
    const { ticks } = buildNetWorthYAxis(1_000_000, 1_250_000, {
      targetTickCount: 5,
    });
    const step = ticks[1]! - ticks[0]!;
    expect(step).toBeGreaterThanOrEqual(100_000);
    const labels = ticks.map((t) =>
      formatNetWorthYAxisTick(t, { kMax: 1, mMax: 1 })
    );
    expect(labels.some((l) => l.includes('m'))).toBe(true);
  });

  it('includes zero when series crosses zero', () => {
    const { ticks } = buildNetWorthYAxis(-50_000, 150_000, {
      targetTickCount: 5,
    });
    expect(ticks).toContain(0);
  });

  it('does not produce adjacent duplicate formatted labels', () => {
    const { ticks, labelPrecision } = buildNetWorthYAxis(1_000_000, 1_050_000, {
      targetTickCount: 5,
    });
    const labels = ticks.map((t) =>
      formatNetWorthYAxisTick(t, {
        kMax: labelPrecision.kMax,
        mMax: labelPrecision.mMax,
      })
    );
    for (let i = 1; i < labels.length; i++) {
      expect(labels[i]).not.toBe(labels[i - 1]);
    }
  });
});

describe('nextLargerNiceStep', () => {
  it('returns strictly larger nice step', () => {
    expect(nextLargerNiceStep(100_000)).toBeGreaterThan(100_000);
  });
});
