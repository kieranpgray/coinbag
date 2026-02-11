import { formatCurrency } from '@/lib/utils';
import type { Asset } from '@/types/domain';

interface AssetPortfolioRowProps {
  asset: Asset;
  onClick: (asset: Asset) => void;
}

/**
 * Compact portfolio row component for individual assets
 * Displays asset name, institution (if present), and value
 * Clickable to open edit modal
 */
export function AssetPortfolioRow({ asset, onClick }: AssetPortfolioRowProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(asset)}
      className="w-full flex items-center justify-between py-2 px-4 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0"
      aria-label={`View details for ${asset.name}`}
    >
      {/* Left side: Name and institution */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="text-body-lg font-medium text-foreground truncate">
          {asset.name}
        </div>
        {asset.institution && (
          <div className="text-body-sm text-muted-foreground truncate mt-0.5">
            {asset.institution}
          </div>
        )}
      </div>

      {/* Right side: Value */}
      <div className="flex-shrink-0">
        <span className="text-body-lg font-medium text-foreground">
          {formatCurrency(asset.value)}
        </span>
      </div>
    </button>
  );
}
