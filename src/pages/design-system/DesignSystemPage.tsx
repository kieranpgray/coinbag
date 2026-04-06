import { useEffect, useMemo, useState } from 'react';
import { responseLooksLikeDesignSystem } from './validateDesignSystemHtml';

const FETCH_TIMEOUT_MS = 15_000;

/** Join Vite `base` with a public asset path (handles `/` and `/subpath/`). */
function designSystemAssetUrl(): string {
  const base = import.meta.env.BASE_URL;
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}design-system-v2.html`;
}

export function DesignSystemPage() {
  const assetUrl = useMemo(() => designSystemAssetUrl(), []);
  const [docHtml, setDocHtml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setDocHtml(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    fetch(assetUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
      })
      .then((html) => {
        if (cancelled) return;
        if (!responseLooksLikeDesignSystem(html)) {
          throw new Error('Unexpected document');
        }
        setDocHtml(html);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof DOMException && err.name === 'AbortError'
            ? 'The design system took too long to load.'
            : 'Could not load the design system.';
        setLoadError(message);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [assetUrl, attempt]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Supafolio — design system';

    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);

    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, []);

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => setAttempt((a) => a + 1)}
          >
            Try again
          </button>
          <a
            href={assetUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Open in a new tab
          </a>
        </div>
      </div>
    );
  }

  if (!docHtml) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        aria-busy="true"
        aria-label="Loading design system"
      />
    );
  }

  return (
    <iframe
      title="Supafolio design system"
      srcDoc={docHtml}
      className="block h-[100dvh] w-full border-0"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
