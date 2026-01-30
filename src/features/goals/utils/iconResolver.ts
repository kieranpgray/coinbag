import { LucideIcon, PiggyBank, TrendingUp, CreditCard, Target } from 'lucide-react';
import type { Goal } from '@/types/domain';

/**
 * Icon mapping for goal types
 */
const GOAL_TYPE_ICONS: Record<string, LucideIcon> = {
  'Save': PiggyBank,
  'Invest': TrendingUp,
  'Pay Off': CreditCard,
  'Grow': Target,
} as const;

/**
 * Icon mapping for goal names (case-insensitive keywords)
 * Ordered by priority - first match wins
 */
const GOAL_NAME_ICON_MAP: Array<{
  keywords: string[];
  icon: LucideIcon;
}> = [
  {
    keywords: ['savings', 'emergency', 'fund'],
    icon: PiggyBank,
  },
  {
    keywords: ['investment', 'invest', 'portfolio', 'stock', 'share'],
    icon: TrendingUp,
  },
  {
    keywords: ['debt', 'pay off', 'payoff', 'loan', 'credit', 'mortgage'],
    icon: CreditCard,
  },
  // Default fallback
  {
    keywords: [],
    icon: Target,
  },
];

/**
 * Resolves the appropriate icon for a goal based on its type and name
 *
 * @param goal - The goal object to resolve icon for
 * @returns LucideIcon component to use for the goal
 */
export function getGoalIcon(goal: Goal): LucideIcon {
  // Priority 1: Use goal.type if it exists and is valid
  if (goal.type) {
    const icon = GOAL_TYPE_ICONS[goal.type];
    if (icon) {
      return icon;
    }
  }

  // Priority 2: Infer from goal name using keywords
  const goalName = goal.name.toLowerCase().trim();

  for (const { keywords, icon } of GOAL_NAME_ICON_MAP) {
    if (keywords.some(keyword => goalName.includes(keyword))) {
      return icon;
    }
  }

  // Priority 3: Default fallback
  return Target;
}
