import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercentage, formatDate } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';
import { PriceFreshnessIndicator } from '@/components/shared/PriceFreshnessIndicator';
import { mapAssetTypeToPriceAssetClass } from '@/lib/services/price-service';
import type { Asset } from '@/types/domain';

interface AssetCardProps {
  asset: Asset;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

export function AssetCard({ asset, onEdit, onDelete }: AssetCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{asset.name}</CardTitle>
            <p className="text-body text-muted-foreground mt-1">{asset.type}</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0"
              onClick={() => onEdit(asset)}
              aria-label="Edit asset"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0"
              onClick={() => onDelete(asset)}
              aria-label="Delete asset"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-body text-muted-foreground">Value</span>
            <span className="font-semibold">{formatCurrency(asset.value)}</span>
          </div>
          {asset.change1D !== undefined && (
            <div className="flex justify-between">
              <span className="text-body text-muted-foreground">1D Change</span>
              <span
                className={`text-body ${
                  asset.change1D >= 0 ? 'text-success' : 'text-error'
                }`}
              >
                {formatPercentage(asset.change1D)}
              </span>
            </div>
          )}
          {asset.change1W !== undefined && (
            <div className="flex justify-between">
              <span className="text-body text-muted-foreground">1W Change</span>
              <span
                className={`text-body ${
                  asset.change1W >= 0 ? 'text-success' : 'text-error'
                }`}
              >
                {formatPercentage(asset.change1W)}
              </span>
            </div>
          )}
          {asset.institution && (
            <div className="flex justify-between">
              <span className="text-body text-muted-foreground">Institution</span>
              <span className="text-body">{asset.institution}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-body text-muted-foreground">Date Added</span>
            <span className="text-body">{formatDate(asset.dateAdded)}</span>
          </div>
          {asset.ticker && mapAssetTypeToPriceAssetClass(asset.type) && (
            <div className="flex justify-between items-center">
              <span className="text-body text-muted-foreground">Price</span>
              <PriceFreshnessIndicator
                fetchedAt={asset.lastPriceFetchedAt}
                assetClass={mapAssetTypeToPriceAssetClass(asset.type)!}
                showLabel={true}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

