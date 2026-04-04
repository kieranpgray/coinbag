import { useLayoutEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DEFAULT_HERO_INDEX,
  type HeroIndex,
  readReloadHandledFor,
  readStoredIndex,
  resolveHeroParam,
  writeReloadHandledFor,
  writeStoredIndex,
} from './heroHeadlineModel';

export function useHeroHeadlineIndex(): HeroIndex {
  const [searchParams] = useSearchParams();
  const heroParam = searchParams.get('hero');
  const [index, setIndex] = useState<HeroIndex>(DEFAULT_HERO_INDEX);

  useLayoutEffect(() => {
    const urlIndex = resolveHeroParam(heroParam);
    if (urlIndex !== null) {
      setIndex(urlIndex);
      return;
    }

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const isReload = nav?.type === 'reload';

    if (!isReload) {
      setIndex(readStoredIndex());
      return;
    }

    const timeOrigin = performance.timeOrigin;
    if (readReloadHandledFor() === String(timeOrigin)) {
      setIndex(readStoredIndex());
      return;
    }

    const stored = readStoredIndex();
    const next = ((stored + 1) % 3) as HeroIndex;
    writeStoredIndex(next);
    writeReloadHandledFor(timeOrigin);
    setIndex(next);
  }, [heroParam]);

  return index;
}
