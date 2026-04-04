import { describe, expect, it } from 'vitest';
import { getDonutRadii } from '../allocationDonutGeometry';

describe('getDonutRadii', () => {
  it('clamps outer radius for small containers', () => {
    const { outerRadius } = getDonutRadii(120, 120);
    expect(outerRadius).toBeGreaterThanOrEqual(48);
    expect(outerRadius).toBeLessThanOrEqual(100);
  });

  it('uses fallback dimensions when width/height are zero', () => {
    const a = getDonutRadii(0, 0);
    const b = getDonutRadii(200, 200);
    expect(a.outerRadius).toBe(b.outerRadius);
  });

  it('returns inner radius as 0.67 of outer', () => {
    const { outerRadius, innerRadius } = getDonutRadii(300, 300);
    expect(innerRadius).toBeCloseTo(outerRadius * 0.67, 5);
  });

  it('assigns tier lg for large min dimension', () => {
    const { tier } = getDonutRadii(400, 400);
    expect(tier).toBe('lg');
  });
});
