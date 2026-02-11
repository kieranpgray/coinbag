import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { AssetCategoryGroup } from './AssetCategoryGroup';
import type { Asset } from '@/types/domain';

interface AssetPortfolioSectionProps {
  totalAssets: number;
  assets: Asset[];
  onCreate: () => void;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

/**
 * Asset categories in display order
 */
const ASSET_CATEGORIES: Array<Asset['type']> = [
  'Real Estate',
  'Investments',
  'Vehicles',
  'Crypto',
  'Cash',
  'Superannuation',
  'Other',
];

/**
 * Portfolio section component for assets
 * Groups assets by category and displays them in a responsive grid layout
 */
export function AssetPortfolioSection({
  totalAssets,
  assets,
  onCreate,
  onEdit,
  onDelete,
}: AssetPortfolioSectionProps) {
  // Group assets by category
  const assetsByCategory = useMemo(() => {
    const grouped: Record<string, Asset[]> = {};
    assets.forEach((asset) => {
      if (!grouped[asset.type]) {
        grouped[asset.type] = [];
      }
      grouped[asset.type].push(asset);
    });
    return grouped;
  }, [assets]);

  // Get categories that have assets, in display order
  const categoriesWithAssets = useMemo(() => {
    return ASSET_CATEGORIES.filter((category) => {
      const categoryAssets = assetsByCategory[category];
      return categoryAssets && categoryAssets.length > 0;
    });
  }, [assetsByCategory]);

  return (
    <section className="space-y-6" aria-label="Assets section">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-foreground text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold">
              Assets
            </h2>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{formatCurrency(totalAssets)}</span>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={onCreate}
            aria-label="Add asset"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Category groups in responsive grid */}
      {categoriesWithAssets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                No assets found. Start building your portfolio.
              </p>
              <Button onClick={onCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Asset
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {categoriesWithAssets.map((category) => (
            <AssetCategoryGroup
              key={category}
              categoryName={category}
              assets={assetsByCategory[category] || []}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
