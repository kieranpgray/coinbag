import { Card } from '@/components/ui/card';
import { CircularProgress } from '@/components/ui/circular-progress';
import { getGoalIcon } from '../utils/iconResolver';
import { formatGoalDate } from '../utils/dateFormatter';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { cn } from '@/lib/utils';
import type { Goal } from '@/types/domain';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
}

/**
 * Determines if a goal is a debt goal based on type, amount, or source
 */
function isDebtGoal(goal: Goal): boolean {
  // Check type
  if (goal.type === 'Pay Off') {
    return true;
  }

  // Check if current amount is negative (indicates debt)
  if (goal.currentAmount < 0) {
    return true;
  }

  // Check source for debt-related keywords
  if (goal.source?.toLowerCase().includes('credit') || goal.source?.toLowerCase().includes('loan')) {
    return true;
  }

  return false;
}

/**
 * Gets the background and progress ring colors based on goal type
 */
function getGoalColors(goal: Goal): { background: string; ring: string; icon: string } {
  switch (goal.type) {
    case 'Save':
      return {
        background: 'bg-blue-50 dark:bg-blue-900/20',
        ring: '#3b82f6', // Blue-500
        icon: 'text-blue-600 dark:text-blue-400',
      };
    case 'Invest':
      return {
        background: 'bg-emerald-50 dark:bg-emerald-900/20',
        ring: '#10b981', // Emerald-500
        icon: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'Pay Off':
      return {
        background: 'bg-orange-50 dark:bg-orange-900/20',
        ring: '#f97316', // Orange-500
        icon: 'text-orange-600 dark:text-orange-400',
      };
    case 'Grow':
    default:
      return {
        background: 'bg-slate-50 dark:bg-slate-800/40',
        ring: 'hsl(var(--primary))',
        icon: 'text-slate-600 dark:text-slate-400',
      };
  }
}

/**
 * Calculates progress value (0-1) with special handling for debt goals
 */
function calculateProgress(goal: Goal): number {
  const isDebt = isDebtGoal(goal);

  // Handle zero target amount
  if (goal.targetAmount === 0) {
    return 1; // Complete
  }

  if (isDebt) {
    // For debt goals, use absolute values for progress calculation
    const progress = Math.abs(goal.currentAmount) / Math.abs(goal.targetAmount);
    return Math.min(Math.max(progress, 0), 1);
  }

  // Normal progress calculation
  const progress = goal.currentAmount / goal.targetAmount;
  return Math.min(Math.max(progress, 0), 1);
}

export function GoalCard({ goal, onEdit }: GoalCardProps) {
  const Icon = getGoalIcon(goal);
  const progress = calculateProgress(goal);
  const colors = getGoalColors(goal);
  const progressPercent = Math.round(progress * 100);

  const handleClick = () => {
    onEdit(goal);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onEdit(goal);
    }
  };

  return (
    <Card
      className={cn(
        'p-6 cursor-pointer transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        'border border-neutral-200 hover:border-neutral-300'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${goal.name} goal, ${progressPercent}% complete. Click to edit.`}
    >
      <div className="flex flex-col items-start space-y-4">
        {/* Circular Icon Badge with Progress Ring */}
        <div className="relative ml-1">
          <div
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-full',
              colors.background
            )}
          >
            <Icon className={cn('w-6 h-6', colors.icon)} aria-hidden="true" />
          </div>
          {/* Progress ring positioned around the badge */}
          <div className="absolute -inset-1.5">
            <CircularProgress
              value={progress}
              size={60}
              strokeWidth={3}
              color={colors.ring}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Text Content Container */}
        <div className="space-y-1 w-full text-left">
          {/* Goal Name */}
          <h3 className="text-lg font-bold text-foreground leading-tight">
            {goal.name}
          </h3>

          {/* Target Date */}
          {goal.deadline && (
            <p className="text-sm text-muted-foreground font-medium">
              {formatGoalDate(goal.deadline)}
            </p>
          )}

          {/* Amounts Section */}
          <div className="pt-2 flex items-baseline gap-1.5 flex-wrap">
            {/* Current Amount (Dominant) */}
            <span className="text-lg font-bold text-primary">
              <PrivacyWrapper value={goal.currentAmount} />
            </span>
            {/* Target Amount (Secondary Context) */}
            <span className="text-sm text-muted-foreground">
              of <PrivacyWrapper value={goal.targetAmount} />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

