import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Ctx = {
  /** Increment while a route-level loading shell (e.g. app Suspense fallback) is visible. */
  beginRouteLoadingShell: () => void;
  endRouteLoadingShell: () => void;
  /** True when at least one shell is mounted — hide global chrome like the dev environment banner. */
  isRouteLoadingShellVisible: boolean;
};

const RouteLoadingBannerContext = createContext<Ctx | null>(null);

export function RouteLoadingBannerProvider({ children }: { children: ReactNode }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const countRef = useRef(0);

  const beginRouteLoadingShell = useCallback(() => {
    countRef.current += 1;
    setVisibleCount(countRef.current);
  }, []);

  const endRouteLoadingShell = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    setVisibleCount(countRef.current);
  }, []);

  const value = useMemo(
    () => ({
      beginRouteLoadingShell,
      endRouteLoadingShell,
      isRouteLoadingShellVisible: visibleCount > 0,
    }),
    [beginRouteLoadingShell, endRouteLoadingShell, visibleCount]
  );

  return <RouteLoadingBannerContext.Provider value={value}>{children}</RouteLoadingBannerContext.Provider>;
}

export function useRouteLoadingBannerOptional() {
  return useContext(RouteLoadingBannerContext);
}
