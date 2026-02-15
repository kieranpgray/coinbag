import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Final call-to-action section
 * Encourages users to get started with Supafolio
 */
export function CTASection() {
  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to take control of your finances?
          </h2>
          <p className="text-lg opacity-90 mb-8 leading-relaxed">
            Take the first step with Supafolio to build wealth and achieve financial freedom.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="px-8 py-3 text-base font-semibold"
          >
            <Link to="/sign-up">
              Start 30-Day Free Trial
            </Link>
          </Button>
          <p className="text-sm opacity-75 mt-4">
            No credit card required • Try free for 30 days
          </p>
        </div>
      </div>
    </section>
  );
}
