import { formatCurrency } from '@/lib/utils';
import { AssetPortfolioRow } from './AssetPortfolioRow';
import {
  Home,
  TrendingUp,
  Car,
  Coins,
  Wallet,
  Building2,
  Package,
  type LucideIcon,
} from 'lucide-react';
import type { Asset } from '@/types/domain';

interface AssetCategoryGroupProps {
  categoryName: string;
  assets: Asset[];
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

/**
 * Icon mapping for asset categories
 */
const ASSET_CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Real Estate': Home,
  'Investments': TrendingUp,
  'Vehicles': Car,
  'Crypto': Coins,
  'Cash': Wallet,
  'Superannuation': Building2,
  'Other': Package,
};

/**
 * Category group component for assets
 * Displays a section header, list of assets, and category total
 */
export function AssetCategoryGroup({
  categoryName,
  assets,
  onEdit,
  onDelete,
}: AssetCategoryGroupProps) {
  const categoryTotal = assets.reduce((sum, asset) => sum + asset.value, 0);

  if (assets.length === 0) {
    return null; // Don't render empty categories
  }

  const CategoryIcon = ASSET_CATEGORY_ICONS[categoryName] || Package;

  return (
    <div className="mb-6 last:mb-0">
      {/* Section header with icon */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <CategoryIcon className="h-5 w-5 text-primary dark:text-iconAccent" aria-hidden="true" />
        </div>
        <h3 className="text-h3 font-semibold text-foreground">{categoryName}</h3>
      </div>

      {/* Asset rows */}
      <div className="mt-1 border border-border rounded-lg bg-surface shadow-sm overflow-hidden">
        {assets.map((asset) => (
          <AssetPortfolioRow key={asset.id} asset={asset} onClick={onEdit} />
        ))}

        {/* Category total row */}
        <div className="flex items-center justify-end py-3 px-4 border-t-2 border-border bg-muted/50">
          <span className="text-body-lg font-bold text-foreground">
            {formatCurrency(categoryTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
