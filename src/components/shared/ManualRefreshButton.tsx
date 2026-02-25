/**
 * Manual refresh button for price-backed assets
 * No "X/3" or count; disabled when unavailable, offline, or pending
 */

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useManualRefreshAvailability, useManualPriceRefresh } from '@/hooks/use-symbol-price';
import { mapAssetTypeToPriceAssetClass } from '@/lib/services/price-service';
import type { PriceFetchRequest } from '@/types/prices';
import type { Asset } from '@/types/domain';
import { cn } from '@/lib/utils';

function buildRequestsFromAssets(assets: Asset[]): PriceFetchRequest[] {
  const requests: PriceFetchRequest[] = [];
  for (const a of assets) {
    if (!a.ticker?.trim()) continue;
    const assetClass = mapAssetTypeToPriceAssetClass(a.type);
    if (!assetClass) continue;
    requests.push({ symbol: a.ticker.trim().toUpperCase(), assetClass });
  }
  return requests;
}

export interface ManualRefreshButtonProps {
  assets: Asset[];
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function ManualRefreshButton({
  assets,
  variant = 'outline',
  size = 'default',
  showLabel = true,
  className,
  onSuccess,
  onError,
}: ManualRefreshButtonProps) {
  const availability = useManualRefreshAvailability();
  const refreshMutation = useManualPriceRefresh();
  const requests = buildRequestsFromAssets(assets);

  const loadFailed = availability.isError;
  const canRefresh = availability.data?.canRefresh ?? false;
  const isPending = refreshMutation.isPending;

  const disabled = !canRefresh || loadFailed || isPending;

  const handleClick = () => {
    if (disabled || requests.length === 0) return;
    refreshMutation.mutate(requests, {
      onSuccess: (result) => {
        if (result.success) {
          onSuccess?.();
        } else {
          onError?.(result.error ?? 'Refresh didn\'t complete; try again later');
        }
      },
      onError: () => {
        onError?.('Refresh didn\'t complete; try again later');
      },
    });
  };

  const tooltipText = disabled
    ? 'Refresh unavailable; try again later'
    : 'Refresh all prices';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn(className)}
            disabled={disabled}
            onClick={handleClick}
            aria-label="Refresh prices"
          >
            <RefreshCw className={cn('h-4 w-4', showLabel && 'mr-2', isPending && 'animate-spin')} />
            {showLabel && 'Refresh'}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
