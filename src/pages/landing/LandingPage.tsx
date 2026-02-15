import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/layout/Footer';

const HERO_STORAGE_KEY = 'supafolio_last_hero_variant';

/**
 * Landing page component with hero variant rotation
 * Handles authentication redirects and hero selection
 */
export function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();

  // Handle authentication redirect
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  // Determine which hero variant to show
  const heroVariant = getHeroVariant();

  // Don't render anything if user is authenticated (will redirect)
  if (isLoaded && isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingNav />
      <main className="flex-1">
        <HeroSection variant={heroVariant} />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

/**
 * Get hero variant based on URL parameter or rotation logic
 * URL parameter takes precedence, otherwise alternates between 'A' and 'B' per visit using localStorage
 */
function getHeroVariant(): 'A' | 'B' {
  // Check for URL override first
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const variantParam = urlParams.get('variant')?.toUpperCase();

    if (variantParam === 'A' || variantParam === 'B') {
      return variantParam as 'A' | 'B';
    }
  } catch (error) {
    // URL parsing failed, continue with localStorage logic
    console.warn('URL parameter parsing failed:', error);
  }

  // Fall back to localStorage rotation logic
  try {
    const lastVariant = localStorage.getItem(HERO_STORAGE_KEY);

    let nextVariant: 'A' | 'B';
    if (!lastVariant) {
      // First visit - randomly choose
      nextVariant = Math.random() < 0.5 ? 'A' : 'B';
    } else {
      // Alternate from last variant
      nextVariant = lastVariant === 'A' ? 'B' : 'A';
    }

    // Store for next visit
    localStorage.setItem(HERO_STORAGE_KEY, nextVariant);
    return nextVariant;
  } catch (error) {
    // localStorage unavailable, default to A
    console.warn('localStorage unavailable for hero rotation:', error);
    return 'A';
  }
}
