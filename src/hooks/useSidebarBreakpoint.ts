import { useState, useEffect } from 'react';

const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;

const tabletQuery = () =>
  typeof window !== 'undefined' &&
  window.matchMedia(`(min-width: ${TABLET_MIN}px) and (max-width: ${DESKTOP_MIN - 1}px)`).matches;

const desktopQuery = () =>
  typeof window !== 'undefined' && window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`).matches;

/**
 * Breakpoint hook for sidebar behaviour:
 * - Below md (768px): mobile — sidebar hidden, burger nav
 * - md to lg-1 (768–1023px): tablet — collapsible icon rail
 * - lg+ (1024px+): desktop — full sidebar
 */
export function useSidebarBreakpoint() {
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const update = () => {
      const tablet = tabletQuery();
      const desktop = desktopQuery();
      setIsTablet(tablet);
      setIsDesktop(desktop);
    };

    update();

    const mqlTablet = window.matchMedia(`(min-width: ${TABLET_MIN}px) and (max-width: ${DESKTOP_MIN - 1}px)`);
    const mqlDesktop = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`);

    const handler = () => update();
    mqlTablet.addEventListener('change', handler);
    mqlDesktop.addEventListener('change', handler);
    return () => {
      mqlTablet.removeEventListener('change', handler);
      mqlDesktop.removeEventListener('change', handler);
    };
  }, []);

  return { isTablet, isDesktop };
}
