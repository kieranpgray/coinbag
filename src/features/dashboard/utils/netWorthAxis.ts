/**
 * Net worth chart Y-axis: financial-grade nice steps and compact currency labels.
 * Aligns with design-system "clean intervals" + compact notation; labels use $…k / $…m.
 * @see public/design-system-v2.html — Area chart / Recharts reference
 */

const LADDER_MULTS = [1, 2, 2.5, 5] as const;

export interface NetWorthYAxisOptions {
  /** Desired number of tick marks (e.g. 5 desktop, 4 mobile). */
  targetTickCount: number;
  /** Padding applied to data min/max before snapping (default 0.1). */
  paddingRatio?: number;
}

export interface NetWorthYAxisResult {
  domain: [number, number];
  ticks: number[];
  /** Max decimals for k/m suffixes when resolving duplicate labels. */
  labelPrecision: { kMax: number; mMax: number };
}

function trimTrailingZeros(s: string): string {
  if (!s.includes('.')) return s;
  return s.replace(/\.?0+$/, '');
}

/**
 * Compact currency tick: `$380k`, `$3k`, `$1.1m`, `$950`, `-$50k`.
 */
export function formatNetWorthYAxisTick(
  value: number,
  opts?: { kMax?: number; mMax?: number }
): string {
  const kMax = opts?.kMax ?? 1;
  const mMax = opts?.mMax ?? 1;
  const neg = value < 0;
  const v = Math.abs(value);

  let body: string;
  if (v >= 1_000_000) {
    body = `${trimTrailingZeros((v / 1_000_000).toFixed(mMax))}m`;
  } else if (v >= 1_000) {
    body = `${trimTrailingZeros((v / 1_000).toFixed(kMax))}k`;
  } else {
    body = `${Math.round(v)}`;
  }

  return neg ? `-$${body}` : `$${body}`;
}

/** Smallest "nice" step >= raw (1,2,2.5,5 × 10^n). */
export function nextNiceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const pow = 10 ** exp;
  for (const m of LADDER_MULTS) {
    const s = m * pow;
    if (s + 1e-12 >= raw) return s;
  }
  return 10 * pow;
}

/** Smallest nice step strictly greater than `step`. */
export function nextLargerNiceStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 1;
  const lo = Math.floor(Math.log10(step)) - 2;
  const hi = Math.ceil(Math.log10(step)) + 2;
  let best = Infinity;
  for (let exp = lo; exp <= hi; exp++) {
    const pow = 10 ** exp;
    for (const m of LADDER_MULTS) {
      const s = m * pow;
      if (s > step && s < best) best = s;
    }
  }
  return Number.isFinite(best) ? best : step * 2;
}

/** Largest nice step strictly less than `step`. */
export function nextSmallerNiceStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0.01;
  const lo = Math.floor(Math.log10(step)) - 3;
  const hi = Math.ceil(Math.log10(step)) + 1;
  let best = -Infinity;
  for (let exp = lo; exp <= hi; exp++) {
    const pow = 10 ** exp;
    for (const m of LADDER_MULTS) {
      const s = m * pow;
      if (s < step && s > best) best = s;
    }
  }
  return best > 0 ? best : step / 2;
}

function hasAdjacentDuplicateLabels(
  ticks: number[],
  kMax: number,
  mMax: number
): boolean {
  if (ticks.length < 2) return false;
  for (let i = 1; i < ticks.length; i++) {
    if (
      formatNetWorthYAxisTick(ticks[i]!, { kMax, mMax }) ===
      formatNetWorthYAxisTick(ticks[i - 1]!, { kMax, mMax })
    ) {
      return true;
    }
  }
  return false;
}

function buildTicksForStep(
  niceStep: number,
  paddedMin: number,
  paddedMax: number,
  crossesZero: boolean
): { niceMin: number; niceMax: number; ticks: number[] } {
  let niceMin = Math.floor(paddedMin / niceStep) * niceStep;
  let niceMax = Math.ceil(paddedMax / niceStep) * niceStep;

  if (crossesZero) {
    niceMin = Math.min(niceMin, Math.floor(0 / niceStep) * niceStep);
    niceMax = Math.max(niceMax, Math.ceil(0 / niceStep) * niceStep);
  }

  const ticks: number[] = [];
  const n = Math.round((niceMax - niceMin) / niceStep);
  for (let i = 0; i <= n; i++) {
    const t = niceMin + i * niceStep;
    ticks.push(Number(t.toPrecision(12)));
  }

  return { niceMin, niceMax, ticks };
}

/**
 * Compute Y domain and tick values from data min/max.
 */
export function buildNetWorthYAxis(
  minValue: number,
  maxValue: number,
  options: NetWorthYAxisOptions
): NetWorthYAxisResult {
  const paddingRatio = options.paddingRatio ?? 0.1;
  const targetTickCount = Math.max(2, Math.floor(options.targetTickCount));

  let min = minValue;
  let max = maxValue;

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return {
      domain: [0, 1000],
      ticks: [0, 250, 500, 750, 1000],
      labelPrecision: { kMax: 1, mMax: 1 },
    };
  }

  if (min === max) {
    const pad = Math.abs(max) * paddingRatio || 1000;
    min -= pad;
    max += pad;
  }

  const crossesZero = minValue < 0 && maxValue > 0;
  const dataRange = max - min;
  const padding = dataRange * paddingRatio;
  let paddedMin = min - padding;
  let paddedMax = max + padding;

  if (crossesZero) {
    paddedMin = Math.min(paddedMin, 0);
    paddedMax = Math.max(paddedMax, 0);
  }

  const rawRange = paddedMax - paddedMin;
  if (rawRange <= 0) {
    return {
      domain: [0, 1000],
      ticks: [0, 250, 500, 750, 1000],
      labelPrecision: { kMax: 1, mMax: 1 },
    };
  }

  const segments = Math.max(1, targetTickCount - 1);
  let niceStep = nextNiceStep(rawRange / segments);

  for (let adjust = 0; adjust < 24; adjust++) {
    const { niceMin, niceMax, ticks } = buildTicksForStep(
      niceStep,
      paddedMin,
      paddedMax,
      crossesZero
    );

    const tickCount = ticks.length;

    if (tickCount > targetTickCount + 1) {
      niceStep = nextLargerNiceStep(niceStep);
      continue;
    }

    if (tickCount < 3 && adjust < 20) {
      const smaller = nextSmallerNiceStep(niceStep);
      if (smaller > 0 && smaller < niceStep) {
        niceStep = smaller;
        continue;
      }
    }

    let kMax = 1;
    let mMax = 1;
    if (hasAdjacentDuplicateLabels(ticks, kMax, mMax)) {
      kMax = 2;
      mMax = 2;
    }

    if (hasAdjacentDuplicateLabels(ticks, kMax, mMax)) {
      niceStep = nextLargerNiceStep(niceStep);
      continue;
    }

    if (ticks.length < 2) {
      niceStep = nextSmallerNiceStep(niceStep);
      continue;
    }

    return {
      domain: [niceMin, niceMax],
      ticks,
      labelPrecision: { kMax, mMax },
    };
  }

  const fallback = buildTicksForStep(
    nextNiceStep(rawRange / segments),
    paddedMin,
    paddedMax,
    crossesZero
  );
  return {
    domain: [fallback.niceMin, fallback.niceMax],
    ticks: fallback.ticks,
    labelPrecision: { kMax: 1, mMax: 1 },
  };
}
