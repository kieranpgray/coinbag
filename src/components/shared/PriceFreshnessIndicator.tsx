/**
 * Price freshness indicator — fresh / stale / error states
 * No numeric refresh count; uses usePriceFreshness
 */

import { Check, AlertTriangle, XCircle } from 'lucide-react';
import { usePriceFreshness } from '@/hooks/use-symbol-price';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { AssetClass } from '@/types/prices';

export interface PriceFreshnessIndicatorProps {
  fetchedAt: string | null | undefined;
  assetClass: AssetClass;
  showLabel?: boolean;
  className?: string;
}

export function PriceFreshnessIndicator({
  fetchedAt,
  assetClass,
  showLabel = true,
  className,
}: PriceFreshnessIndicatorProps) {
  const status = usePriceFreshness(fetchedAt, assetClass);

  if (!fetchedAt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-caption text-destructive',
                className
              )}
              aria-label="Price not available"
            >
              <XCircle className="h-3 w-3" />
              {showLabel && 'Price not available'}
            </span>
          </TooltipTrigger>
          <TooltipContent>No price data available for this asset</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const ago = formatDistanceToNow(new Date(fetchedAt), { addSuffix: true });

  if (status === 'error') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-caption text-destructive',
                className
              )}
              aria-label="Price outdated"
            >
              <XCircle className="h-3 w-3" />
              {showLabel && 'Price outdated'}
            </span>
          </TooltipTrigger>
          <TooltipContent>Last updated {ago}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (status === 'stale') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-caption text-amber-600 dark:text-amber-500',
                className
              )}
              aria-label="Price may be outdated"
            >
              <AlertTriangle className="h-3 w-3" />
              {showLabel && `Updated ${ago}`}
            </span>
          </TooltipTrigger>
          <TooltipContent>Price may be outdated</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-caption text-muted-foreground',
              className
            )}
            aria-label="Price up to date"
          >
            <Check className="h-3 w-3" />
            {showLabel && `Updated ${ago}`}
          </span>
        </TooltipTrigger>
        <TooltipContent>Price up to date</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
