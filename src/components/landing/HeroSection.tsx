import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTypewriter } from '@/hooks/useTypewriter';

interface HeroSectionProps {
  variant: 'A' | 'B';
}

const HERO_CONFIGS = {
  A: {
    staticText: 'Ask your money about',
    phrases: [
      'coffee habits',
      'subscriptions',
      'spending trends',
    ],
    subheadline: 'Connect your accounts and let AI surface patterns, explain changes, and answer everyday questions about where your money is really going.',
    typeSpeed: 65,
    deleteSpeed: 50,
    pauseAfterComplete: 1500, // 1.5 seconds - pause after typing completes, before deletion starts
    pauseBeforeNext: 500, // 0.5 seconds - pause after deletion completes, before next phrase starts typing
  },
  B: {
    staticText: 'Your AI copilot for',
    phrases: [
      'budgeting better',
      'understanding money',
      'planning ahead',
    ],
    subheadline: 'Connect your accounts, upload statements, and track assets and liabilities. Your AI copilot helps you interpret change, simulate scenarios, and stay ahead of what matters.',
    typeSpeed: 65,
    deleteSpeed: 50,
    pauseAfterComplete: 1500, // 1.5 seconds - pause after typing completes, before deletion starts
    pauseBeforeNext: 500, // 0.5 seconds - pause after deletion completes, before next phrase starts typing
  },
} as const;

/**
 * Hero section with rotating variants and typewriter animation
 * Respects accessibility preferences and only shows one variant at a time
 */
export function HeroSection({ variant }: HeroSectionProps) {
  const config = HERO_CONFIGS[variant];
  const { displayText, showCursor } = useTypewriter({
    phrases: config.phrases,
    typeSpeed: config.typeSpeed,
    deleteSpeed: config.deleteSpeed,
    pauseBeforeNext: config.pauseBeforeNext,
    pauseAfterComplete: config.pauseAfterComplete,
    loop: true,
    cursor: true,
  });

  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5" />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            <span className="block mb-2">{config.staticText}</span>
            <span className="block text-primary min-h-[1.2em] relative">
              {displayText}
              {showCursor && (
                <span className="inline-block w-1 h-[1em] bg-primary ml-1 animate-pulse" />
              )}
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            {config.subheadline}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="px-8 py-3 text-base">
              <Link to="/sign-up">
                Get Started
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8 py-3 text-base">
              <Link to="/sign-in">
                Sign In
              </Link>
            </Button>
          </div>

          {/* Trust indicators or additional messaging could go here */}
          <div className="mt-12 text-sm text-muted-foreground">
            Try free for 30 days • No credit card required
          </div>
        </div>
      </div>
    </section>
  );
}
