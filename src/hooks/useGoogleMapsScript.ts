import { useEffect, useState } from 'react';

const SCRIPT_ID = 'google-maps-places-script';

declare global {
  interface Window {
    google?: typeof google;
    __googleMapsPlacesResolve?: () => void;
  }
}

/**
 * Loads the Google Maps JavaScript API with the Places library.
 * Script is loaded once per API key. Returns { loaded: true } when ready.
 * If apiKey is missing/empty, loaded stays false and no script is injected.
 */
export function useGoogleMapsScript(apiKey: string | undefined): {
  loaded: boolean;
  error: boolean;
} {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!apiKey?.trim()) {
      return;
    }

    const key = apiKey.trim();

    if (window.google?.maps?.places) {
      setLoaded(true);
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.key !== key) {
        setError(true);
        return;
      }
      if (window.google?.maps?.places) {
        setLoaded(true);
        return;
      }
      existing.addEventListener('load', onLoad);
      return () => existing.removeEventListener('load', onLoad);
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.dataset.key = key;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    script.onload = onLoad;
    script.onerror = () => setError(true);
    document.head.appendChild(script);

    function onLoad() {
      if (window.google?.maps?.places) {
        setLoaded(true);
      } else {
        setError(true);
      }
    }

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [apiKey]);

  return { loaded, error };
}
