export const DEFAULT_HERO_INDEX = 0 as const;

const STORAGE_INDEX_KEY = 'supafolio:landingHeroIndex';
const STORAGE_RELOAD_HANDLED_KEY = 'supafolio:landingHeroReloadHandledFor';

export type HeroIndex = 0 | 1 | 2;

export function normalizeIndex(raw: unknown): HeroIndex {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (n === 0 || n === 1 || n === 2) return n;
  return DEFAULT_HERO_INDEX;
}

export function readStoredIndex(): HeroIndex {
  try {
    const s = sessionStorage.getItem(STORAGE_INDEX_KEY);
    if (s === null) return DEFAULT_HERO_INDEX;
    return normalizeIndex(parseInt(s, 10));
  } catch {
    return DEFAULT_HERO_INDEX;
  }
}

export function writeStoredIndex(i: HeroIndex) {
  try {
    sessionStorage.setItem(STORAGE_INDEX_KEY, String(i));
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function readReloadHandledFor(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_RELOAD_HANDLED_KEY);
  } catch {
    return null;
  }
}

export function writeReloadHandledFor(timeOrigin: number) {
  try {
    sessionStorage.setItem(STORAGE_RELOAD_HANDLED_KEY, String(timeOrigin));
  } catch {
    /* ignore */
  }
}

/** `hero1` / `hero2` / `hero3` — opaque QA slugs, not copy-derived. */
export function resolveHeroParam(param: string | null): HeroIndex | null {
  if (param === 'hero1') return 0;
  if (param === 'hero2') return 1;
  if (param === 'hero3') return 2;
  return null;
}
