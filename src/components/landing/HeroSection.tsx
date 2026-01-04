import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTypewriter } from '@/hooks/useTypewriter';

interface HeroSectionProps {
  variant: 'A' | 'B';
}

const HERO_CONFIGS = {
  A: {
    staticText: 'Ask your finances…',
    phrases: [
      'anything.',
      'what happens if markets drop 10%?',
      'why your spending changed last month.',
      'how exposed you are to risk.',
      'what matters most right now.',
    ],
    subheadline: 'Connect your accounts, track income and expenses, and model assets and liabilities — then use AI to understand, simulate, and monitor your entire financial picture.',
    typeSpeed: 56, // Reduced speed by further 10% (cumulative ~28% reduction)
    deleteSpeed: 28, // Reduced speed by further 10%
    pauseAfterComplete: 1200,
    pauseBeforeNext: 400,
  },
  B: {
    staticText: 'Your AI copilot for…',
    phrases: [
      'better financial decisions.',
      'understanding your money.',
      'when the market shifts.',
      'income, spending, and wealth.',
    ],
    subheadline: 'Connect your accounts, upload statements, and track assets and liabilities. Your AI copilot helps you interpret change, simulate scenarios, and stay ahead of what matters.',
    typeSpeed: 61, // Reduced speed by further 10%
    deleteSpeed: 31, // Reduced speed by further 10%
    pauseAfterComplete: 1300,
    pauseBeforeNext: 300,
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
