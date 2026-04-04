import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { LandingPageV2 } from '@/components/landing/v2/LandingPageV2';

/**
 * Landing page component.
 * Keeps authenticated users out of marketing pages.
 */
export function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to hash targets (e.g. Product → #how-it-works); scroll-margin-top offsets the fixed nav
  useEffect(() => {
    const id = location.hash.replace(/^#/, '');
    if (!id) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }, 0);
    return () => window.clearTimeout(t);
  }, [location.pathname, location.hash]);

  // Handle authentication redirect
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  // Don't render anything if user is authenticated (will redirect).
  if (isLoaded && isSignedIn) {
    return null;
  }

  return <LandingPageV2 />;
}
