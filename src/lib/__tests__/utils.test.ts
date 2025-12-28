import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercentage, formatDate, calculatePercentageChange } from '../utils';

describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => {
    expect(formatCurrency(1000)).toBe('$1,000');
    expect(formatCurrency(1000000)).toBe('$1,000,000');
    expect(formatCurrency(1234.56)).toBe('$1,235');
  });

  it('formats negative numbers correctly', () => {
    expect(formatCurrency(-1000)).toBe('-$1,000');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0');
  });
});

describe('formatPercentage', () => {
  it('formats positive percentages with + sign', () => {
    expect(formatPercentage(5.5)).toBe('+5.5%');
    expect(formatPercentage(10)).toBe('+10.0%');
  });

  it('formats negative percentages correctly', () => {
    expect(formatPercentage(-5.5)).toBe('-5.5%');
  });

  it('respects decimal places parameter', () => {
    expect(formatPercentage(5.556, 2)).toBe('+5.56%');
    expect(formatPercentage(5.5, 0)).toBe('+6%');
    expect(formatPercentage(5.56, 1)).toBe('+5.6%');
    expect(formatPercentage(5.54, 1)).toBe('+5.5%');
  });
});

describe('formatDate', () => {
  it('formats date strings correctly', () => {
    const date = new Date('2024-01-15');
    const formatted = formatDate(date);
    expect(formatted).toMatch(/Jan/);
    expect(formatted).toMatch(/2024/);
  });

  it('formats ISO date strings correctly', () => {
    const formatted = formatDate('2024-01-15T00:00:00.000Z');
    expect(formatted).toMatch(/Jan/);
  });
});

describe('calculatePercentageChange', () => {
  it('calculates positive change correctly', () => {
    expect(calculatePercentageChange(100, 110)).toBe(10);
    expect(calculatePercentageChange(100, 150)).toBe(50);
  });

  it('calculates negative change correctly', () => {
    expect(calculatePercentageChange(100, 90)).toBe(-10);
  });

  it('handles zero old value', () => {
    expect(calculatePercentageChange(0, 100)).toBe(0);
  });
});

