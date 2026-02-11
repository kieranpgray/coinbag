import { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, Coins, ArrowLeftRight, PiggyBank, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants/routes';
import type { LucideIcon } from 'lucide-react';

interface CardData {
  icon: LucideIcon;
  title: string;
  description: string;
  color: 'blue' | 'emerald' | 'purple' | 'pink';
  action: string;
  href: string;
}

const cards: CardData[] = [
  {
    icon: Wallet,
    title: 'Add an account',
    description: 'Connect your bank or add manually',
    color: 'blue',
    action: 'Add account',
    href: ROUTES.app.accounts,
  },
  {
    icon: Coins,
    title: 'Add assets',
    description: 'Track investments, crypto, and more',
    color: 'emerald',
    action: 'Add asset',
    href: ROUTES.wealth.createAsset(),
  },
  {
    icon: ArrowLeftRight,
    title: 'Set up transfers',
    description: 'Manage cash flow between accounts',
    color: 'purple',
    action: 'Set up transfers',
    href: ROUTES.app.transfers,
  },
  {
    icon: PiggyBank,
    title: 'Create budget',
    description: 'Take control of your spending',
    color: 'pink',
    action: 'Set budget',
    href: ROUTES.app.budget,
  },
];

const colorMap: Record<string, string> = {
  blue: 'group-hover:bg-primary/5 group-hover:border-primary/20',
  emerald: 'group-hover:bg-success/5 group-hover:border-success/20',
  purple: 'group-hover:bg-primary/5 group-hover:border-primary/20',
  pink: 'group-hover:bg-primary/5 group-hover:border-primary/20',
};

const iconColorMap: Record<string, string> = {
  blue: 'bg-primary',
  emerald: 'bg-success',
  purple: 'bg-primary',
  pink: 'bg-primary',
};

const buttonColorMap: Record<string, string> = {
  blue: 'bg-primary hover:bg-primary/90',
  emerald: 'bg-success hover:bg-success/90',
  purple: 'bg-primary hover:bg-primary/90',
  pink: 'bg-primary hover:bg-primary/90',
};

export function CardBasedFlow() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-8 py-12">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-12"
      >
        {/* Welcome Badge */}
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 mb-6">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm">Welcome to Coinbag</span>
        </div>

        {/* Main Heading */}
        <h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold mb-3">Let's get your finances organized</h2>

        {/* Subheading */}
        <p className="text-muted-foreground max-w-md mx-auto">
          Choose any action below to start tracking your wealth and building better financial habits
        </p>
      </motion.div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const isHovered = hoveredCard === index;

          return (
            <motion.div
              key={card.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  'group p-6 cursor-pointer transition-all duration-300 border-2 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  colorMap[card.color]
                )}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => navigate(card.href)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(card.href);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${card.title}: ${card.description}`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon Container */}
                  <div
                    className={cn(
                      'rounded-xl p-3 transition-transform duration-300',
                      iconColorMap[card.color],
                      isHovered && 'scale-110'
                    )}
                  >
                    <Icon className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 text-left">
                    <h3 className="text-h3 mb-1 text-foreground">{card.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{card.description}</p>

                    {/* Action Button */}
                    <Button
                      asChild
                      size="sm"
                      className={cn(
                        'gap-2 transition-opacity',
                        isHovered ? 'opacity-100' : 'opacity-0',
                        buttonColorMap[card.color]
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Link to={card.href}>
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        {card.action}
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
