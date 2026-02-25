import { memo } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ListData } from '../utils/liabilityAllocation';

interface LiabilitiesAllocationListProps {
  data: ListData[];
}

/**
 * Format percentage for display
 * Shows "< 1%" for allocations less than 1%
 */
function formatPercentage(percentage: number): string {
  if (percentage > 0 && percentage < 1) {
    return '< 1%';
  }
  return `${Math.round(percentage)}%`;
}

/**
 * Individual row component with tooltip
 */
function AllocationRow({ item }: { item: ListData }) {
  const Icon = item.icon;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div
          className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-default"
          title={`${item.category}: ${formatPercentage(item.percentage)}`}
        >
          {/* Icon */}
          <Icon className="h-5 w-5 text-muted-foreground dark:text-iconAccent flex-shrink-0" />

          {/* Category name */}
          <div className="flex-1 min-w-0">
            <span className="text-body font-medium text-foreground truncate block">
              {item.category}
            </span>
          </div>

          {/* Formatted balance - right aligned */}
          <span className="text-body font-semibold text-foreground text-right flex-shrink-0 min-w-[80px]">
            <PrivacyWrapper value={item.value} />
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{formatPercentage(item.percentage)}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Liability allocation list component
 * Displays breakdown with icons, percentage pills, and formatted balances
 */
export const LiabilitiesAllocationList = memo(function LiabilitiesAllocationList({
  data,
}: LiabilitiesAllocationListProps) {
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {data.map((item) => (
          <AllocationRow key={item.category} item={item} />
        ))}

        {/* View all liabilities link */}
        <Link
          to="/app/wealth"
          className="mt-4 inline-block text-body text-primary hover:underline"
        >
          View all liabilities →
        </Link>
      </div>
    </TooltipProvider>
  );
});
