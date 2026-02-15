import {
  BarChart3,
  Shield,
  PiggyBank,
  CreditCard
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Dashboard & Net Worth Tracking',
    description: 'Get a complete view of your financial health with real-time net worth calculations and comprehensive portfolio insights.',
  },
  {
    icon: PiggyBank,
    title: 'Assets & Liabilities Management',
    description: 'Track investments, real estate, vehicles, crypto, and debts in one unified interface with detailed analytics.',
  },
  {
    icon: CreditCard,
    title: 'Account Integration',
    description: 'Connect your bank accounts, credit cards, and investment accounts for automatic transaction syncing and categorization.',
  },
  {
    icon: Shield,
    title: 'Privacy & Security',
    description: 'Bank-level encryption with privacy mode to hide sensitive information when needed. Your data stays yours.',
  },
] as const;

/**
 * Features section showcasing key Supafolio capabilities
 * Grid layout with icons, titles, and descriptions
 */
export function FeaturesSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything you need to manage your money
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful tools designed to give you complete control over your financial future
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {FEATURES.map((feature, index) => (
            <Card
              key={index}
              className="p-6 bg-background border-border hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
