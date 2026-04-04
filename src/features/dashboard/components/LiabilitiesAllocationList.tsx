import { memo } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { cn } from '@/lib/utils';
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

function formatPercentage(percentage: number): string {
  if (percentage > 0 && percentage < 1) {
    return '< 1%';
  }
  return `${Math.round(percentage)}%`;
}

function AllocationRow({ item }: { item: ListData }) {
  const Icon = item.icon;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div
          tabIndex={0}
          className={cn(
            'flex min-h-11 items-center gap-3 rounded-md px-2 py-3 transition-colors cursor-default',
            'hover:bg-muted/50',
            'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          )}
          aria-label={`${item.category}, ${formatPercentage(item.percentage)}`}
        >
          <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground dark:text-iconAccent" />

          <div className="min-w-0 flex-1">
            <span className="text-body font-medium text-foreground block truncate">
              {item.category}
            </span>
          </div>

          <span className="min-w-[80px] flex-shrink-0 text-right text-body font-semibold text-foreground">
            <PrivacyWrapper value={item.value} />
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-semibold text-foreground">{item.category}</p>
        <p className="text-sm text-muted-foreground">{formatPercentage(item.percentage)}</p>
        <p className="text-sm text-foreground">
          <PrivacyWrapper value={item.value} />
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

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
