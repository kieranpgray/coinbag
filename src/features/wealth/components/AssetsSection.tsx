import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { AssetCard } from '@/features/assets/components/AssetCard';
import { AssetPortfolioSection } from './AssetPortfolioSection';
import type { Asset } from '@/types/domain';

interface AssetsSectionProps {
  totalAssets: number;
  assets: Asset[];
  onCreate: () => void;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  viewMode?: 'list' | 'cards';
}

/**
 * Assets section component
 * Displays total assets and asset sources with category filtering and view toggle
 * Supports both portfolio view (list mode) and card view (cards mode)
 */
export function AssetsSection({
  totalAssets,
  assets,
  onCreate,
  onEdit,
  onDelete,
  viewMode = 'cards',
}: AssetsSectionProps) {
  const { t } = useTranslation('pages');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const assetCategories: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'Property', label: 'Property' },
    { value: 'Other asset', label: 'Other asset' },
    { value: 'Vehicle', label: 'Vehicle' },
    { value: 'Crypto', label: 'Crypto' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Super', label: 'Super' },
    { value: 'Shares', label: 'Shares' },
    { value: 'RSUs', label: 'RSUs' },
  ];

  const getAssetsForCategory = (category: string) => {
    if (category === 'all') {
      return assets;
    }
    return assets.filter((asset) => asset.type === category);
  };

  // Portfolio view: render grouped portfolio section
  if (viewMode === 'list') {
    return (
      <AssetPortfolioSection
        totalAssets={totalAssets}
        assets={assets}
        onCreate={onCreate}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  // Cards view: render existing tabbed card interface
  return (
    <section className="space-y-6" aria-label={`${t('whatYouOwn')} section`}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-foreground text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold">{t('whatYouOwn')}</h2>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">
              {formatCurrency(totalAssets)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={onCreate}
            aria-label="Add an asset"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add an asset
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full">
        <TabsList className="w-full justify-start">
          {assetCategories.map((category) => (
            <TabsTrigger key={category.value} value={category.value}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {assetCategories.map((category) => (
          <TabsContent key={category.value} value={category.value} className="mt-6">
            {getAssetsForCategory(category.value).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="space-y-4">
                    {category.value === 'all' || assets.length === 0 ? (
                      <>
                        <h3 className="text-h3 font-semibold text-foreground">
                          {t('emptyStates.holdingsNoAssets.headline')}
                        </h3>
                        <p className="text-muted-foreground text-balance max-w-lg mx-auto">
                          {t('emptyStates.holdingsNoAssets.body')}
                        </p>
                        <Button
                          onClick={onCreate}
                          size="sm"
                          aria-label={t('emptyStates.holdingsNoAssets.ctaAriaLabel')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('emptyStates.holdingsNoAssets.cta')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground text-balance max-w-lg mx-auto">
                          {t('emptyStates.holdingsAssetTabEmpty', { category: category.label })}
                        </p>
                        <Button
                          onClick={onCreate}
                          size="sm"
                          aria-label={t('emptyStates.holdingsNoAssets.ctaAriaLabel')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('emptyStates.holdingsNoAssets.cta')}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getAssetsForCategory(category.value).map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

