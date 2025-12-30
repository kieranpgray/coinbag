import { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, Coins, Target, PiggyBank, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
    href: '/accounts',
  },
  {
    icon: Coins,
    title: 'Add assets',
    description: 'Track investments, crypto, and more',
    color: 'emerald',
    action: 'Add asset',
    href: '/assets?create=1',
  },
  {
    icon: Target,
    title: 'Set a goal',
    description: 'Save for something meaningful',
    color: 'purple',
    action: 'Create goal',
    href: '/goals',
  },
  {
    icon: PiggyBank,
    title: 'Create budget',
    description: 'Take control of your spending',
    color: 'pink',
    action: 'Set budget',
    href: '/subscriptions',
  },
];

const colorMap: Record<string, string> = {
  blue: 'group-hover:bg-gradient-to-br group-hover:from-blue-500/10 group-hover:to-blue-600/10 group-hover:border-blue-300',
  emerald:
    'group-hover:bg-gradient-to-br group-hover:from-emerald-500/10 group-hover:to-emerald-600/10 group-hover:border-emerald-300',
  purple:
    'group-hover:bg-gradient-to-br group-hover:from-purple-500/10 group-hover:to-purple-600/10 group-hover:border-purple-300',
  pink: 'group-hover:bg-gradient-to-br group-hover:from-pink-500/10 group-hover:to-pink-600/10 group-hover:border-pink-300',
};

const iconColorMap: Record<string, string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
};

const buttonColorMap: Record<string, string> = {
  blue: 'bg-blue-600 hover:bg-blue-700',
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
  pink: 'bg-pink-600 hover:bg-pink-700',
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
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 rounded-full px-4 py-2 mb-6">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm">Welcome to Coinbag</span>
        </div>

        {/* Main Heading */}
        <h2 className="mb-3">Let's get your finances organized</h2>

        {/* Subheading */}
        <p className="text-gray-600 max-w-md mx-auto">
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
                  'group p-6 cursor-pointer transition-all duration-300 border-2 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
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
                    <h3 className="mb-1">{card.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{card.description}</p>

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

